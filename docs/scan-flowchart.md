# Scan System Flowchart

## Main Scan Flow

```mermaid
flowchart TD
    SCAN[Badge Scanned at Kiosk] --> LOOKUP{Member found\nby badge ID?}

    LOOKUP -->|No| ERR_MEMBER[Return 404\nMember Not Found]
    LOOKUP -->|Yes| DIR{Direction?}

    %% ─── CHECK-IN FLOW ───
    DIR -->|IN| CREATE_IN[Create check-in record\ndirection = 'in']
    CREATE_IN --> INVALIDATE_CACHE[Invalidate presence cache]
    INVALIDATE_CACHE --> INSERT_DB[(INSERT into checkins table)]
    INSERT_DB --> WS_CHECKIN[/Broadcast checkin:new\nvia WebSocket/]
    WS_CHECKIN --> IS_DDS{Is this member\ntoday's DDS?}

    IS_DDS -->|No| DONE_IN([Check-in Complete])
    IS_DDS -->|Yes| FIRST_TODAY{First check-in\nof the day?}

    FIRST_TODAY -->|No| DONE_IN
    FIRST_TODAY -->|Yes| DDS_ACCEPT[[DDS Acceptance Flow]]

    %% ─── CHECK-OUT FLOW ───
    DIR -->|OUT| HOLDS_LOCKUP{Member holds\nlockup responsibility?}

    HOLDS_LOCKUP -->|No| CREATE_OUT[Create check-in record\ndirection = 'out']
    CREATE_OUT --> INVALIDATE_CACHE_OUT[Invalidate presence cache]
    INVALIDATE_CACHE_OUT --> INSERT_DB_OUT[(INSERT into checkins table)]
    INSERT_DB_OUT --> WS_CHECKOUT[/Broadcast checkin:new\ndirection = 'out'/]
    WS_CHECKOUT --> DONE_OUT([Check-out Complete])

    HOLDS_LOCKUP -->|Yes| BLOCK_OUT[Return 403\nLOCKUP_HELD]
    BLOCK_OUT --> SHOW_OPTIONS[Return available options:\n- Transfer lockup\n- Execute lockup\n+ eligible recipients list]

    %% ─── STYLES ───
    classDef error fill:#fee,stroke:#c00,color:#900
    classDef success fill:#efe,stroke:#0a0,color:#060
    classDef ws fill:#eef,stroke:#00c,color:#006
    classDef db fill:#fef,stroke:#a0a,color:#606
    classDef subprocess fill:#ffe,stroke:#aa0,color:#660

    class ERR_MEMBER,BLOCK_OUT error
    class DONE_IN,DONE_OUT success
    class WS_CHECKIN,WS_CHECKOUT ws
    class INSERT_DB,INSERT_DB_OUT db
    class DDS_ACCEPT subprocess
```

## DDS Acceptance Flow

```mermaid
flowchart TD
    START([DDS Acceptance Triggered]) --> VALIDATE{Member exists\nin database?}

    VALIDATE -->|No| ERR_404[Throw NotFoundError]

    VALIDATE -->|Yes| CHECK_EXISTING{Existing DDS\nassignment today?}

    %% ─── NO EXISTING ASSIGNMENT ───
    CHECK_EXISTING -->|None exists| CREATE_NEW[Create new dds_assignment\nstatus = 'active'\nacceptedAt = now]
    CREATE_NEW --> AUDIT_LOG

    %% ─── PENDING FOR THIS MEMBER ───
    CHECK_EXISTING -->|Pending, same member| ACTIVATE[Update dds_assignment\nstatus = 'active'\nacceptedAt = now]
    ACTIVATE --> AUDIT_LOG

    %% ─── ALREADY ACTIVE ───
    CHECK_EXISTING -->|Active| ERR_CONFLICT_ACTIVE[Throw ConflictError\n'DDS already accepted today']

    %% ─── PENDING FOR DIFFERENT MEMBER ───
    CHECK_EXISTING -->|Pending, different member| ERR_CONFLICT_OTHER[Throw ConflictError\n'DDS already assigned today']

    %% ─── POST-ASSIGNMENT ───
    AUDIT_LOG[(Write to\nresponsibility_audit_log\naction = 'self_accepted')] --> LOCKUP_CHECK{Current lockup\nstatus?}

    LOCKUP_CHECK -->|Someone else holds it| TRANSFER[Transfer lockup to DDS\nreason = 'dds_handoff']
    LOCKUP_CHECK -->|Nobody holds it| ACQUIRE[DDS acquires lockup\ndirectly]

    TRANSFER --> LOCKUP_OK{Lockup operation\nsucceeded?}
    ACQUIRE --> LOCKUP_OK

    LOCKUP_OK -->|Yes| WS_DDS[/Broadcast dds:update\naction = 'accepted'/]
    LOCKUP_OK -->|No| LOG_ERR[Log error\nDDS acceptance still succeeds]
    LOG_ERR --> WS_DDS

    WS_DDS --> DONE([DDS Acceptance Complete])

    %% ─── STYLES ───
    classDef error fill:#fee,stroke:#c00,color:#900
    classDef success fill:#efe,stroke:#0a0,color:#060
    classDef ws fill:#eef,stroke:#00c,color:#006
    classDef db fill:#fef,stroke:#a0a,color:#606
    classDef warn fill:#ffd,stroke:#aa0,color:#660

    class ERR_404,ERR_CONFLICT_ACTIVE,ERR_CONFLICT_OTHER error
    class DONE success
    class WS_DDS ws
    class AUDIT_LOG db
    class LOG_ERR warn
```

## DDS Determination Flow

```mermaid
flowchart TD
    START([Who is today's DDS?]) --> CHECK_TABLE{Check dds_assignments\nfor today's date\nstatus = pending | active}

    CHECK_TABLE -->|Found| RETURN_ASSIGNMENT([Return DDS assignment])

    CHECK_TABLE -->|Not found| FALLBACK[Fall back to\nweekly schedule]

    FALLBACK --> OP_DATE[Calculate operational date\n3 AM cutoff:\n00:00-02:59 = previous day]
    OP_DATE --> OP_WEEK[Get Monday of\noperational week]
    OP_WEEK --> FIND_ROLE{Find duty role\nwhere code = 'DDS'}

    FIND_ROLE -->|Not found| NO_DDS([No DDS today])
    FIND_ROLE -->|Found| FIND_SCHEDULE{Find weekly_schedule\nfor this role + week}

    FIND_SCHEDULE -->|Not found| NO_DDS
    FIND_SCHEDULE -->|Found| HAS_ASSIGNMENT{Has non-released\nassignment?}

    HAS_ASSIGNMENT -->|No| NO_DDS
    HAS_ASSIGNMENT -->|Yes| RETURN_SCHEDULE([Return schedule-based DDS])

    %% ─── STYLES ───
    classDef success fill:#efe,stroke:#0a0,color:#060
    classDef none fill:#f5f5f5,stroke:#999,color:#666

    class RETURN_ASSIGNMENT,RETURN_SCHEDULE success
    class NO_DDS none
```

## Lockup Eligibility Check

```mermaid
flowchart TD
    START([Can member receive lockup?]) --> QUERY{Has active\nmember_qualification?}

    QUERY -->|No qualifications| INELIGIBLE([Not eligible])

    QUERY -->|Has qualifications| EXPIRED{Qualification\nexpired?}

    EXPIRED -->|Yes, all expired| INELIGIBLE
    EXPIRED -->|No, has valid one| TYPE_CHECK{Qualification type has\ncanReceiveLockup = true?}

    TYPE_CHECK -->|No| INELIGIBLE
    TYPE_CHECK -->|Yes| ELIGIBLE([Eligible for lockup])

    ELIGIBLE_TYPES[Qualifying types:\n- DDS_QUALIFIED\n- SWK_QUALIFIED\n- BUILDING_AUTHORIZED] -.-> TYPE_CHECK

    %% ─── STYLES ───
    classDef success fill:#efe,stroke:#0a0,color:#060
    classDef none fill:#fee,stroke:#c00,color:#900
    classDef info fill:#f5f5ff,stroke:#99c,color:#669

    class ELIGIBLE success
    class INELIGIBLE none
    class ELIGIBLE_TYPES info
```

## WebSocket Events Summary

```mermaid
flowchart LR
    subgraph Events Emitted
        C[checkin:new] --> CR[checkins room]
        D[dds:update] --> DR[dds room]
        P[presence:update] --> PR[presence room]
    end

    subgraph Triggers
        T1[Any check-in/out] -->|always| C
        T2[DDS accepted/assigned/\ntransferred/released] -->|on change| D
        T3[Presence count changes] -->|on change| P
    end

    classDef event fill:#eef,stroke:#00c,color:#006
    class C,D,P event
```
