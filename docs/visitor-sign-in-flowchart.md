# Visitor Sign-in System Flowchart

## Visitor Sign-in Flow (Admin Panel)

```mermaid
flowchart TD
    START[Admin opens Visitor Sign-in Form] --> FILL[Admin enters visitor details:\n- Name, Organization\n- Visit Type, Visit Reason\n- Host Member, Event link]

    FILL --> BADGE_Q{Assign temporary\nbadge?}

    %% ─── WITH BADGE ───
    BADGE_Q -->|Yes| SCAN_BADGE[Scan/select temporary badge]
    SCAN_BADGE --> BADGE_AVAIL{Badge available?\nassignmentType = 'temporary'\nstatus = 'active'\nNot assigned to active visitor}

    BADGE_AVAIL -->|No| BADGE_ERR[Show error:\nBadge unavailable or\nalready assigned]
    BADGE_ERR --> BADGE_Q

    BADGE_AVAIL -->|Yes| SUBMIT

    %% ─── WITHOUT BADGE ───
    BADGE_Q -->|No| SUBMIT[Submit sign-in form]

    %% ─── DATABASE WRITES ───
    SUBMIT --> INSERT_VISITOR[(INSERT into visitors table\ncheckInTime = now\ncheckOutTime = NULL\ncheckInMethod = admin_manual\ncreatedByAdmin = admin.id)]

    INSERT_VISITOR --> HAS_BADGE{Temporary badge\nassigned?}

    HAS_BADGE -->|Yes| UPDATE_BADGE[(UPDATE badges table\nassignedToId = visitor.id\nlastUsed = now)]
    HAS_BADGE -->|No| BROADCAST

    UPDATE_BADGE --> BROADCAST

    %% ─── REAL-TIME UPDATES ───
    BROADCAST --> WS_VISITOR[/Broadcast visitor:signin\nvia WebSocket/]
    WS_VISITOR --> WS_PRESENCE[/Broadcast presence:update\nvia WebSocket/]
    WS_PRESENCE --> DONE([Visitor Sign-in Complete\nAdmin sees confirmation])

    %% ─── STYLES ───
    classDef error fill:#fee,stroke:#c00,color:#900
    classDef success fill:#efe,stroke:#0a0,color:#060
    classDef ws fill:#eef,stroke:#00c,color:#006
    classDef db fill:#fef,stroke:#a0a,color:#606
    classDef form fill:#ffe,stroke:#aa0,color:#660

    class BADGE_ERR error
    class DONE success
    class WS_VISITOR,WS_PRESENCE ws
    class INSERT_VISITOR,UPDATE_BADGE db
    class START,FILL,SCAN_BADGE,SUBMIT form
```

## Visitor Sign-out Flow

```mermaid
flowchart TD
    START{Sign-out method?}

    %% ─── BADGE SCAN AT KIOSK ───
    START -->|Badge scanned at kiosk| LOOKUP_BADGE[Lookup badge\nby serial number]
    LOOKUP_BADGE --> IS_TEMP{Badge\nassignmentType?}

    IS_TEMP -->|member| MEMBER_FLOW([Route to Member\nCheck-in/out Flow])
    IS_TEMP -->|temporary| FIND_VISITOR{Active visitor\nwith this badge?\ncheckOutTime IS NULL}

    FIND_VISITOR -->|No| ERR_NO_VISITOR[Return 404\nNo active visitor\nfor this badge]
    FIND_VISITOR -->|Yes| CHECKOUT

    %% ─── ADMIN MANUAL ───
    START -->|Admin panel| SELECT_VISITOR[Admin selects active visitor\nfrom presence list]
    SELECT_VISITOR --> CHECKOUT

    %% ─── CHECKOUT PROCESS ───
    CHECKOUT --> UPDATE_VISITOR[(UPDATE visitors table\ncheckOutTime = now)]

    UPDATE_VISITOR --> HAD_BADGE{Visitor had\ntemporary badge?}

    HAD_BADGE -->|Yes| RELEASE_BADGE[(UPDATE badges table\nassignedToId = NULL\nstatus = 'active')]
    HAD_BADGE -->|No| BROADCAST

    RELEASE_BADGE --> BROADCAST

    %% ─── REAL-TIME UPDATES ───
    BROADCAST --> WS_VISITOR[/Broadcast visitor:signout\nvia WebSocket/]
    WS_VISITOR --> WS_PRESENCE[/Broadcast presence:update\nvia WebSocket/]
    WS_PRESENCE --> DONE([Visitor Sign-out Complete])

    %% ─── STYLES ───
    classDef error fill:#fee,stroke:#c00,color:#900
    classDef success fill:#efe,stroke:#0a0,color:#060
    classDef ws fill:#eef,stroke:#00c,color:#006
    classDef db fill:#fef,stroke:#a0a,color:#606
    classDef subprocess fill:#ffe,stroke:#aa0,color:#660

    class ERR_NO_VISITOR error
    class DONE success
    class WS_VISITOR,WS_PRESENCE ws
    class UPDATE_VISITOR,RELEASE_BADGE db
    class MEMBER_FLOW subprocess
```

## Updated Main Scan Flow (Badge Scan Router)

This replaces the top of the existing scan flowchart to handle both member and visitor badges.

```mermaid
flowchart TD
    SCAN[Badge Scanned at Kiosk] --> LOOKUP_BADGE{Badge found\nby serial number?}

    LOOKUP_BADGE -->|No| ERR_BADGE[Return 404\nBadge Not Found]

    LOOKUP_BADGE -->|Yes| BADGE_TYPE{Badge\nassignmentType?}

    %% ─── MEMBER BADGE ───
    BADGE_TYPE -->|member| LOOKUP_MEMBER{Member found\nassigned to badge?}
    LOOKUP_MEMBER -->|No| ERR_MEMBER[Return 404\nMember Not Found]
    LOOKUP_MEMBER -->|Yes| MEMBER_FLOW[[Existing Member\nCheck-in/out Flow\ndirection toggle]]

    %% ─── TEMPORARY BADGE ───
    BADGE_TYPE -->|temporary| ACTIVE_VISITOR{Active visitor\nwith this badge?\ncheckOutTime IS NULL}

    ACTIVE_VISITOR -->|Yes| VISITOR_CHECKOUT[[Visitor Sign-out Flow\ncheckOutTime = now\nrelease badge]]
    ACTIVE_VISITOR -->|No| ERR_UNASSIGNED[Return 400\nTemporary badge\nnot assigned to\nactive visitor]

    %% ─── STYLES ───
    classDef error fill:#fee,stroke:#c00,color:#900
    classDef success fill:#efe,stroke:#0a0,color:#060
    classDef subprocess fill:#ffe,stroke:#aa0,color:#660

    class ERR_BADGE,ERR_MEMBER,ERR_UNASSIGNED error
    class MEMBER_FLOW,VISITOR_CHECKOUT subprocess
```

## Tables Updated Summary

```mermaid
flowchart LR
    subgraph "Sign-in (INSERT/UPDATE)"
        V1[(visitors\nINSERT new row)]
        B1[(badges\nUPDATE assignedToId)]
    end

    subgraph "Sign-out (UPDATE)"
        V2[(visitors\nSET checkOutTime)]
        B2[(badges\nCLEAR assignedToId)]
    end

    subgraph "WebSocket Broadcasts"
        WS1[/visitor:signin/]
        WS2[/visitor:signout/]
        WS3[/presence:update/]
    end

    V1 --> WS1
    V2 --> WS2
    WS1 --> WS3
    WS2 --> WS3

    classDef db fill:#fef,stroke:#a0a,color:#606
    classDef ws fill:#eef,stroke:#00c,color:#006

    class V1,B1,V2,B2 db
    class WS1,WS2,WS3 ws
```

## WebSocket Events Summary (Updated)

```mermaid
flowchart LR
    subgraph "Events Emitted"
        C[checkin:new] --> CR[checkins room]
        D[dds:update] --> DR[dds room]
        P[presence:update] --> PR[presence room]
        VS[visitor:signin] --> VR[visitors room]
        VO[visitor:signout] --> VR
    end

    subgraph "Triggers"
        T1[Member check-in/out] -->|always| C
        T2[DDS state change] -->|on change| D
        T3[Any presence change] -->|on change| P
        T4[Visitor signs in] -->|always| VS
        T5[Visitor signs out] -->|always| VO
    end

    classDef event fill:#eef,stroke:#00c,color:#006
    class C,D,P,VS,VO event
```
