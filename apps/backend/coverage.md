
> @sentinel/backend@2.0.0 test:coverage /home/sauk/projects/sentinel/apps/backend
> vitest run --coverage


[1m[46m RUN [49m[22m [36mv4.0.17 [39m[90m/home/sauk/projects/sentinel/apps/backend[39m
      [2mCoverage enabled with [22m[33mv8[39m

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate service number
[22m[39mprisma:error 
Invalid `this.prisma.member.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:462:45

  459  * Create a new member
  460  */
  461 async create(data: CreateMemberInput): Promise<Member> {
→ 462   const member = await this.prisma.member.create(
Unique constraint failed on the fields: (`service_number`)

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when division does not exist
[22m[39mprisma:error 
Invalid `this.prisma.member.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:462:45

  459  * Create a new member
  460  */
  461 async create(data: CreateMemberInput): Promise<Member> {
→ 462   const member = await this.prisma.member.create(
Foreign key constraint violated on the constraint: `members_division_id_fkey`

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when member does not exist
[22m[39mprisma:error 
Invalid `tx.member.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:555:41

  552 // Update member fields if any
  553 let updatedMember
  554 if (hasFieldUpdate) {
→ 555   updatedMember = await tx.member.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when updating to duplicate service number
[22m[39mprisma:error 
Invalid `tx.member.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:555:41

  552 // Update member fields if any
  553 let updatedMember
  554 if (hasFieldUpdate) {
→ 555   updatedMember = await tx.member.update(
Unique constraint failed on the fields: (`service_number`)

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mbulkCreate[2m > [22m[2mshould rollback entire transaction on error
[22m[39mprisma:error 
Invalid `tx.member.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:715:25

  712 let insertedCount = 0
  713 
  714 for (const memberData of members) {
→ 715   await tx.member.create(
Unique constraint failed on the fields: (`service_number`)

[90mstdout[2m | tests/integration/repositories/member-repository.test.js[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mAdditional edge cases for coverage[2m > [22m[2mfilter edge cases[2m > [22m[2mshould return empty array when no members match combined filters
[22m[39mprisma:error 
Invalid `this.prisma.member.findMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:245:46

  242   ]
  243 }
  244 
→ 245 const members = await this.prisma.member.findMany(
Invalid input value: invalid input syntax for type uuid: "non-existent-division"

 [31m❯[39m tests/integration/repositories/member-repository.test.js [2m([22m[2m65 tests[22m[2m | [22m[31m7 failed[39m[2m)[22m[33m 124127[2mms[22m[39m
       [33m[2m✓[22m[39m should create a member with all required fields [33m 2426[2mms[22m[39m
       [33m[2m✓[22m[39m should create a member with all optional fields [33m 1839[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate service number [33m 1831[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when division does not exist [33m 1766[2mms[22m[39m
       [33m[2m✓[22m[39m should find member by ID with division and badge [33m 1845[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when member does not exist [33m 1806[2mms[22m[39m
       [33m[2m✓[22m[39m should find member by service number [33m 1775[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when service number does not exist [33m 1816[2mms[22m[39m
       [33m[2m✓[22m[39m should update member basic fields [33m 1817[2mms[22m[39m
       [33m[2m✓[22m[39m should update member status [33m 1772[2mms[22m[39m
       [33m[2m✓[22m[39m should update member division [33m 1787[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when member does not exist [33m 1768[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating to duplicate service number [33m 1815[2mms[22m[39m
       [33m[2m✓[22m[39m should soft delete a member [33m 1858[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when member does not exist [33m 1833[2mms[22m[39m
       [33m[2m✓[22m[39m should find all members without filters [33m 1835[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by division [33m 1846[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by member type [33m 1827[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by status [33m 1897[2mms[22m[39m
       [33m[2m✓[22m[39m should search by name [33m 1888[2mms[22m[39m
       [33m[2m✓[22m[39m should search by service number [33m 1969[2mms[22m[39m
       [33m[2m✓[22m[39m should combine multiple filters [33m 2520[2mms[22m[39m
       [33m[2m✓[22m[39m should paginate results with default page size [33m 1946[2mms[22m[39m
       [33m[2m✓[22m[39m should return second page of results [33m 1903[2mms[22m[39m
       [33m[2m✓[22m[39m should sort by field ascending [33m 1866[2mms[22m[39m
       [33m[2m✓[22m[39m should sort by field descending [33m 1870[2mms[22m[39m
       [33m[2m✓[22m[39m should combine pagination with filters [33m 1865[2mms[22m[39m
       [33m[2m✓[22m[39m should find multiple members by IDs [33m 1972[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no IDs provided [33m 2174[2mms[22m[39m
       [33m[2m✓[22m[39m should skip non-existent IDs [33m 2165[2mms[22m[39m
       [33m[2m✓[22m[39m should find multiple members by service numbers [33m 2235[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no service numbers provided [33m 2139[2mms[22m[39m
       [33m[2m✓[22m[39m should create multiple members in one transaction [33m 2164[2mms[22m[39m
       [33m[2m✓[22m[39m should rollback entire transaction on error [33m 2288[2mms[22m[39m
[31m       [31m×[31m should update multiple members in one transaction[39m[33m 1884[2mms[22m[39m
[31m       [31m×[31m should rollback on error[39m[33m 1753[2mms[22m[39m
       [33m[2m✓[22m[39m should add tag to member [33m 1775[2mms[22m[39m
       [33m[2m✓[22m[39m should add multiple tags to member [33m 1791[2mms[22m[39m
       [33m[2m✓[22m[39m should not duplicate tags [33m 1823[2mms[22m[39m
       [33m[2m✓[22m[39m should remove tag from member [33m 1807[2mms[22m[39m
       [33m[2m✓[22m[39m should filter members by tags [33m 1738[2mms[22m[39m
       [33m[2m✓[22m[39m should exclude members by tags [33m 1698[2mms[22m[39m
       [33m[2m✓[22m[39m should flag member for review [33m 1696[2mms[22m[39m
       [33m[2m✓[22m[39m should clear badge reference from member [33m 1699[2mms[22m[39m
       [33m[2m✓[22m[39m should return absent when no checkins exist [33m 1747[2mms[22m[39m
       [33m[2m✓[22m[39m should return present when last checkin is IN [33m 1737[2mms[22m[39m
       [33m[2m✓[22m[39m should return absent when last checkin is OUT [33m 1756[2mms[22m[39m
       [33m[2m✓[22m[39m should return absent for member with no badge [33m 1730[2mms[22m[39m
         [33m[2m✓[22m[39m should handle removing non-existent tag gracefully [33m 1729[2mms[22m[39m
         [33m[2m✓[22m[39m should handle adding tag to multiple members [33m 1767[2mms[22m[39m
         [33m[2m✓[22m[39m should handle empty search string [33m 1864[2mms[22m[39m
[31m         [31m×[31m should return empty array when no members match combined filters[39m[33m 1821[2mms[22m[39m
         [33m[2m✓[22m[39m should handle null badge in filters [33m 1849[2mms[22m[39m
[31m         [31m×[31m should return empty array for page beyond total pages[39m[33m 1763[2mms[22m[39m
[31m         [31m×[31m should handle limit of 1[39m[33m 1940[2mms[22m[39m
[31m         [31m×[31m should handle very large limit[39m[33m 2067[2mms[22m[39m
[31m         [31m×[31m should handle empty array in bulkCreate[39m[33m 1891[2mms[22m[39m
         [33m[2m✓[22m[39m should handle single item in bulkUpdate [33m 1796[2mms[22m[39m
         [33m[2m✓[22m[39m should handle bulkUpdate with no updates needed [33m 1765[2mms[22m[39m
         [33m[2m✓[22m[39m should handle duplicate service numbers in input [33m 1758[2mms[22m[39m
         [33m[2m✓[22m[39m should handle mix of existing and non-existing service numbers [33m 1781[2mms[22m[39m
         [33m[2m✓[22m[39m should handle flagging multiple members [33m 1838[2mms[22m[39m
         [33m[2m✓[22m[39m should handle empty array in flagForReview [33m 1782[2mms[22m[39m
         [33m[2m✓[22m[39m should handle clearing badge for multiple members [33m 1793[2mms[22m[39m
         [33m[2m✓[22m[39m should handle clearing badge that has no members [33m 1801[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent CRUD - create[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `this.prisma.event.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:145:43

  142   data.createdBy &&
  143   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.createdBy)
  144 
→ 145 const event = await this.prisma.event.create(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent CRUD - update[2m > [22m[2mshould throw error when updating non-existent event
[22m[39mprisma:error 
Invalid `this.prisma.event.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:201:45

  198 updateData.updatedAt = new Date()
  199 
  200 try {
→ 201   const event = await this.prisma.event.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent CRUD - delete[2m > [22m[2mshould throw error when deleting non-existent event
[22m[39mprisma:error 
Invalid `this.prisma.event.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:220:31

  217  */
  218 async delete(id: string): Promise<void> {
  219   try {
→ 220     await this.prisma.event.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent Attendee - updateAttendee[2m > [22m[2mshould throw error when attendee not found
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:329:56

  326 updateData.updatedAt = new Date()
  327 
  328 try {
→ 329   const attendee = await this.prisma.eventAttendee.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent Attendee - removeAttendee[2m > [22m[2mshould throw error when attendee not found
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:348:39

  345  */
  346 async removeAttendee(id: string): Promise<void> {
  347   try {
→ 348     await this.prisma.eventAttendee.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

[90mstdout[2m | tests/integration/repositories/event-repository.test.ts[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mBadge Assignment - assignBadge[2m > [22m[2mshould throw error when attendee not found
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:368:56

  365  */
  366 async assignBadge(attendeeId: string, badgeId: string): Promise<EventAttendee> {
  367   try {
→ 368     const attendee = await this.prisma.eventAttendee.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

 [31m❯[39m tests/integration/repositories/event-repository.test.ts [2m([22m[2m39 tests[22m[2m | [22m[31m5 failed[39m[2m)[22m[33m 77130[2mms[22m[39m
       [33m[2m✓[22m[39m should create an event with all required fields [33m 1935[2mms[22m[39m
[31m       [31m×[31m should create event without description[39m[33m 1788[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when status is missing [33m 1828[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when autoExpireBadges is undefined [33m 1845[2mms[22m[39m
[31m       [31m×[31m should handle invalid createdBy UUID[39m[33m 1789[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1713[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no events exist [33m 1817[2mms[22m[39m
       [33m[2m✓[22m[39m should return all events sorted by startDate desc [33m 1766[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing event by ID [33m 1828[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when event does not exist [33m 1789[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing event by code [33m 1730[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1762[2mms[22m[39m
       [33m[2m✓[22m[39m should update event name [33m 1750[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 1801[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent event [33m 1781[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1828[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing event [33m 1700[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent event [33m 1714[2mms[22m[39m
       [33m[2m✓[22m[39m should add attendee with all fields [33m 1739[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when status is missing [33m 1750[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no attendees [33m 1815[2mms[22m[39m
       [33m[2m✓[22m[39m should return all attendees sorted by name [33m 1999[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing attendee [33m 1886[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when attendee does not exist [33m 1762[2mms[22m[39m
       [33m[2m✓[22m[39m should update attendee fields [33m 1734[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when attendee not found [33m 1811[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1857[2mms[22m[39m
       [33m[2m✓[22m[39m should remove existing attendee [33m 1750[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when attendee not found [33m 1800[2mms[22m[39m
       [33m[2m✓[22m[39m should assign badge to attendee [33m 1818[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when attendee not found [33m 1826[2mms[22m[39m
[31m       [31m×[31m should unassign badge from attendee[39m[33m 1884[2mms[22m[39m
[31m       [31m×[31m should return statistics for event[39m[33m 1811[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when no attendees [33m 1783[2mms[22m[39m
[31m       [31m×[31m should return only active attendees[39m[33m 1787[2mms[22m[39m
       [33m[2m✓[22m[39m should record check-in [33m 1818[2mms[22m[39m
       [33m[2m✓[22m[39m should return checkin history sorted by timestamp desc [33m 1876[2mms[22m[39m
       [33m[2m✓[22m[39m should return last checkin direction [33m 1848[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when no checkins [33m 1827[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate username
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:243:46

  240  * Create a new admin user
  241  */
  242 async create(data: CreateAdminUserData): Promise<AdminUser> {
→ 243   const user = await this.prisma.adminUser.create(
Unique constraint failed on the fields: (`username`)

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould return null when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:182:46

  179  * Find admin user by ID
  180  */
  181 async findById(id: string): Promise<AdminUser | null> {
→ 182   const user = await this.prisma.adminUser.findUnique(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:372:46

  369   throw new Error('No fields to update')
  370 }
  371 
→ 372 const user = await this.prisma.adminUser.update(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mupdateLastLogin[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:281:48

  278  * Update last login timestamp
  279  */
  280 async updateLastLogin(id: string): Promise<void> {
→ 281   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdisable[2m > [22m[2mshould disable admin user account
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdisable[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdisable[2m > [22m[2mshould set disabledAt timestamp
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "admin"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2menable[2m > [22m[2mshould re-enable disabled admin user
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2menable[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:430:48

  427  * Re-enable a disabled admin user account
  428  */
  429 async enable(id: string): Promise<void> {
→ 430   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mresetPassword[2m > [22m[2mshould reset admin user password
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:448:48

  445  * Reset an admin user's password (admin-initiated)
  446  */
  447 async resetPassword(id: string, passwordHash: string, updatedBy: string): Promise<void> {
→ 448   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mresetPassword[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:448:48

  445  * Reset an admin user's password (admin-initiated)
  446  */
  447 async resetPassword(id: string, passwordHash: string, updatedBy: string): Promise<void> {
→ 448   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mresetPassword[2m > [22m[2mshould track who reset the password
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:448:48

  445  * Reset an admin user's password (admin-initiated)
  446  */
  447 async resetPassword(id: string, passwordHash: string, updatedBy: string): Promise<void> {
→ 448   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "admin_user_123"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.deleteMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:399:48

  396  * Delete an admin user
  397  */
  398 async delete(id: string): Promise<void> {
→ 399   const result = await this.prisma.adminUser.deleteMany(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould allow deleting disabled user
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.js[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2medge cases[2m > [22m[2mshould handle multiple disable/enable cycles
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "admin1"

 [31m❯[39m tests/integration/repositories/admin-user-repository.test.js [2m([22m[2m38 tests[22m[2m | [22m[31m14 failed[39m[2m)[22m[33m 76077[2mms[22m[39m
       [33m[2m✓[22m[39m should create admin user with all required fields [33m 1997[2mms[22m[39m
       [33m[2m✓[22m[39m should create admin user with firstName and lastName [33m 1786[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate username [33m 1802[2mms[22m[39m
       [33m[2m✓[22m[39m should create user with different roles [33m 1825[2mms[22m[39m
       [33m[2m✓[22m[39m should find admin user by ID [33m 1896[2mms[22m[39m
[31m       [31m×[31m should return null when user does not exist[39m[33m 1850[2mms[22m[39m
       [33m[2m✓[22m[39m should find disabled user by ID [33m 1782[2mms[22m[39m
       [33m[2m✓[22m[39m should find admin user by username with password [33m 1779[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when username does not exist [33m 1742[2mms[22m[39m
       [33m[2m✓[22m[39m should find user case-insensitively [33m 1774[2mms[22m[39m
       [33m[2m✓[22m[39m should find all active admin users [33m 1853[2mms[22m[39m
       [33m[2m✓[22m[39m should not include disabled users [33m 1816[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no active users [33m 1761[2mms[22m[39m
       [33m[2m✓[22m[39m should find all users including disabled [33m 1920[2mms[22m[39m
       [33m[2m✓[22m[39m should update admin user display name [33m 1891[2mms[22m[39m
       [33m[2m✓[22m[39m should update admin user email [33m 1962[2mms[22m[39m
       [33m[2m✓[22m[39m should update admin user role [33m 1729[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when no fields provided [33m 1684[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when user does not exist [33m 1752[2mms[22m[39m
[31m       [31m×[31m should track updatedBy field[39m[33m 1728[2mms[22m[39m
       [33m[2m✓[22m[39m should update last login timestamp [33m 1816[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1880[2mms[22m[39m
[31m       [31m×[31m should disable admin user account[39m[33m 2027[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1963[2mms[22m[39m
[31m       [31m×[31m should set disabledAt timestamp[39m[33m 1833[2mms[22m[39m
[31m       [31m×[31m should re-enable disabled admin user[39m[33m 1857[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1855[2mms[22m[39m
       [33m[2m✓[22m[39m should allow enabling already enabled user [33m 1821[2mms[22m[39m
[31m       [31m×[31m should reset admin user password[39m[33m 1760[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1744[2mms[22m[39m
[31m       [31m×[31m should track who reset the password[39m[33m 1835[2mms[22m[39m
       [33m[2m✓[22m[39m should delete admin user [33m 1824[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1879[2mms[22m[39m
[31m       [31m×[31m should allow deleting disabled user[39m[33m 1796[2mms[22m[39m
       [33m[2m✓[22m[39m should handle updating password hash [33m 1809[2mms[22m[39m
       [33m[2m✓[22m[39m should handle creating user without email [33m 1767[2mms[22m[39m
       [33m[2m✓[22m[39m should handle creating user without firstName/lastName [33m 1787[2mms[22m[39m
[31m       [31m×[31m should handle multiple disable/enable cycles[39m[33m 1857[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate username
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:243:46

  240  * Create a new admin user
  241  */
  242 async create(data: CreateAdminUserData): Promise<AdminUser> {
→ 243   const user = await this.prisma.adminUser.create(
Unique constraint failed on the fields: (`username`)

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould return null when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:182:46

  179  * Find admin user by ID
  180  */
  181 async findById(id: string): Promise<AdminUser | null> {
→ 182   const user = await this.prisma.adminUser.findUnique(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:372:46

  369   throw new Error('No fields to update')
  370 }
  371 
→ 372 const user = await this.prisma.adminUser.update(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mupdateLastLogin[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:281:48

  278  * Update last login timestamp
  279  */
  280 async updateLastLogin(id: string): Promise<void> {
→ 281   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdisable[2m > [22m[2mshould disable admin user account
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdisable[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdisable[2m > [22m[2mshould set disabledAt timestamp
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "admin"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2menable[2m > [22m[2mshould re-enable disabled admin user
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2menable[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:430:48

  427  * Re-enable a disabled admin user account
  428  */
  429 async enable(id: string): Promise<void> {
→ 430   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mresetPassword[2m > [22m[2mshould reset admin user password
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:448:48

  445  * Reset an admin user's password (admin-initiated)
  446  */
  447 async resetPassword(id: string, passwordHash: string, updatedBy: string): Promise<void> {
→ 448   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mresetPassword[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:448:48

  445  * Reset an admin user's password (admin-initiated)
  446  */
  447 async resetPassword(id: string, passwordHash: string, updatedBy: string): Promise<void> {
→ 448   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mresetPassword[2m > [22m[2mshould track who reset the password
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:448:48

  445  * Reset an admin user's password (admin-initiated)
  446  */
  447 async resetPassword(id: string, passwordHash: string, updatedBy: string): Promise<void> {
→ 448   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "admin_user_123"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when user does not exist
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.deleteMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:399:48

  396  * Delete an admin user
  397  */
  398 async delete(id: string): Promise<void> {
→ 399   const result = await this.prisma.adminUser.deleteMany(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould allow deleting disabled user
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/repositories/admin-user-repository.test.ts[2m > [22m[2mAdminUserRepository Integration Tests[2m > [22m[2medge cases[2m > [22m[2mshould handle multiple disable/enable cycles
[22m[39mprisma:error 
Invalid `this.prisma.adminUser.updateMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/admin-user-repository.ts:412:48

  409  * Disable an admin user account (soft delete)
  410  */
  411 async disable(id: string, disabledBy: string): Promise<void> {
→ 412   const result = await this.prisma.adminUser.updateMany(
Invalid input value: invalid input syntax for type uuid: "admin1"

 [31m❯[39m tests/integration/repositories/admin-user-repository.test.ts [2m([22m[2m38 tests[22m[2m | [22m[31m14 failed[39m[2m)[22m[33m 74080[2mms[22m[39m
       [33m[2m✓[22m[39m should create admin user with all required fields [33m 1690[2mms[22m[39m
       [33m[2m✓[22m[39m should create admin user with firstName and lastName [33m 1556[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate username [33m 1610[2mms[22m[39m
       [33m[2m✓[22m[39m should create user with different roles [33m 1622[2mms[22m[39m
       [33m[2m✓[22m[39m should find admin user by ID [33m 1463[2mms[22m[39m
[31m       [31m×[31m should return null when user does not exist[39m[33m 1444[2mms[22m[39m
       [33m[2m✓[22m[39m should find disabled user by ID [33m 1506[2mms[22m[39m
       [33m[2m✓[22m[39m should find admin user by username with password [33m 1706[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when username does not exist [33m 1767[2mms[22m[39m
       [33m[2m✓[22m[39m should find user case-insensitively [33m 1689[2mms[22m[39m
       [33m[2m✓[22m[39m should find all active admin users [33m 1536[2mms[22m[39m
       [33m[2m✓[22m[39m should not include disabled users [33m 1464[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no active users [33m 1765[2mms[22m[39m
       [33m[2m✓[22m[39m should find all users including disabled [33m 2662[2mms[22m[39m
       [33m[2m✓[22m[39m should update admin user display name [33m 2776[2mms[22m[39m
       [33m[2m✓[22m[39m should update admin user email [33m 1921[2mms[22m[39m
       [33m[2m✓[22m[39m should update admin user role [33m 1707[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when no fields provided [33m 1854[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when user does not exist [33m 1843[2mms[22m[39m
[31m       [31m×[31m should track updatedBy field[39m[33m 1854[2mms[22m[39m
       [33m[2m✓[22m[39m should update last login timestamp [33m 1777[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1744[2mms[22m[39m
[31m       [31m×[31m should disable admin user account[39m[33m 1833[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1827[2mms[22m[39m
[31m       [31m×[31m should set disabledAt timestamp[39m[33m 1826[2mms[22m[39m
[31m       [31m×[31m should re-enable disabled admin user[39m[33m 1845[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1811[2mms[22m[39m
       [33m[2m✓[22m[39m should allow enabling already enabled user [33m 1785[2mms[22m[39m
[31m       [31m×[31m should reset admin user password[39m[33m 1830[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1861[2mms[22m[39m
[31m       [31m×[31m should track who reset the password[39m[33m 1844[2mms[22m[39m
       [33m[2m✓[22m[39m should delete admin user [33m 1804[2mms[22m[39m
[31m       [31m×[31m should throw error when user does not exist[39m[33m 1727[2mms[22m[39m
[31m       [31m×[31m should allow deleting disabled user[39m[33m 1795[2mms[22m[39m
       [33m[2m✓[22m[39m should handle updating password hash [33m 1836[2mms[22m[39m
       [33m[2m✓[22m[39m should handle creating user without email [33m 1766[2mms[22m[39m
       [33m[2m✓[22m[39m should handle creating user without firstName/lastName [33m 1716[2mms[22m[39m
[31m       [31m×[31m should handle multiple disable/enable cycles[39m[33m 1685[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould create visitor with all required fields
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "John Visitor",
            organization: "Test Org",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: null,
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:32:30.312Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould create visitor with host member
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Jane Visitor",
            organization: "External",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: "2ddb5820-f4dd-4029-a247-08ab754b4ab2",
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:32:32.118Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould create visitor for event
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Event Visitor",
            organization: "Event Org",
            visitType: "event",
            visitTypeId: null,
            hostMemberId: null,
            eventId: "7ea474d3-9ff1-43cc-bc1a-817c8a52a674",
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:32:33.782Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould default checkInTime to now if not provided
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Auto Time Visitor",
            organization: "Test",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: null,
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:32:35.321Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when host member does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Visitor",
            organization: "Test",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: "non-existent",
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:32:36.948Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when event does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Visitor",
            organization: "Test",
            visitType: "event",
            visitTypeId: null,
            hostMemberId: null,
            eventId: "non-existent",
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:32:38.487Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould return null when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:67:47

  64  * Find visitor by ID
  65  */
  66 async findById(id: string): Promise<Visitor | null> {
→ 67   const visitor = await this.prisma.visitor.findUnique(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mfindAll[2m > [22m[2mshould filter by date range
[22m[39mprisma:error 
Invalid `prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/tests/helpers/factories.ts:174:25

  171 ) {
  172   const id = getUniqueId()
  173 
→ 174   return prisma.visitor.create({
          data: {
            name: "Visitor 13",
            organization: "Test Organization",
            visitType: "contractor",
            visitReason: "Test visit",
            kioskId: "KIOSK001",
            checkInMethod: "kiosk",
            visitDate: new Date("2026-01-22T21:32:47.406Z"),
            ~~~~~~~~~
        ?   id?: String,
        ?   checkInTime?: DateTime,
        ?   checkOutTime?: DateTime | Null,
        ?   createdAt?: DateTime | Null,
        ?   adminNotes?: String | Null,
        ?   admin_users?: AdminUserCreateNestedOneWithoutVisitorsInput,
        ?   event?: EventCreateNestedOneWithoutVisitorsInput,
        ?   hostMember?: MemberCreateNestedOneWithoutVisitorsInput,
        ?   badge?: BadgeCreateNestedOneWithoutVisitorsInput,
        ?   visitTypeRef?: VisitTypeCreateNestedOneWithoutVisitorsInput
          }
        })

Unknown argument `visitDate`. Did you mean `visitType`? Available options are marked with ?.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mfindActive[2m > [22m[2mshould find visitors who have not checked out
[22m[39mprisma:error 
Invalid `prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/tests/helpers/factories.ts:174:25

  171 ) {
  172   const id = getUniqueId()
  173 
→ 174   return prisma.visitor.create({
          data: {
            name: "Visitor 14",
            organization: "Test Organization",
            visitType: "contractor",
            visitReason: "Test visit",
            kioskId: "KIOSK001",
            checkInMethod: "kiosk",
            visitDate: new Date("2026-01-23T21:32:50.525Z"),
            ~~~~~~~~~
        ?   id?: String,
        ?   checkInTime?: DateTime,
        ?   checkOutTime?: DateTime | Null,
        ?   createdAt?: DateTime | Null,
        ?   adminNotes?: String | Null,
        ?   admin_users?: AdminUserCreateNestedOneWithoutVisitorsInput,
        ?   event?: EventCreateNestedOneWithoutVisitorsInput,
        ?   hostMember?: MemberCreateNestedOneWithoutVisitorsInput,
        ?   badge?: BadgeCreateNestedOneWithoutVisitorsInput,
        ?   visitTypeRef?: VisitTypeCreateNestedOneWithoutVisitorsInput
          }
        })

Unknown argument `visitDate`. Did you mean `visitType`? Available options are marked with ?.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:162:47

  159  * Update visitor details (event, host, purpose)
  160  */
  161 async update(id: string, data: UpdateVisitorInput): Promise<Visitor> {
→ 162   const visitor = await this.prisma.visitor.update(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcheckout[2m > [22m[2mshould throw error when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:193:47

  190  * Checkout a visitor (set checkout time to now)
  191  */
  192 async checkout(id: string): Promise<Visitor> {
→ 193   const visitor = await this.prisma.visitor.update(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mfindHistory[2m > [22m[2mshould filter by name
[22m[39mprisma:error 
Invalid `prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/tests/helpers/factories.ts:174:25

  171 ) {
  172   const id = getUniqueId()
  173 
→ 174   return prisma.visitor.create({
          data: {
            name: "Visitor 34",
            organization: "Test Organization",
            visitType: "contractor",
            visitReason: "Test visit",
            kioskId: "KIOSK001",
            checkInMethod: "kiosk",
            firstName: "John",
            ~~~~~~~~~
            lastName: "Doe",
        ?   id?: String,
        ?   checkInTime?: DateTime,
        ?   checkOutTime?: DateTime | Null,
        ?   createdAt?: DateTime | Null,
        ?   adminNotes?: String | Null,
        ?   admin_users?: AdminUserCreateNestedOneWithoutVisitorsInput,
        ?   event?: EventCreateNestedOneWithoutVisitorsInput,
        ?   hostMember?: MemberCreateNestedOneWithoutVisitorsInput,
        ?   badge?: BadgeCreateNestedOneWithoutVisitorsInput,
        ?   visitTypeRef?: VisitTypeCreateNestedOneWithoutVisitorsInput
          }
        })

Unknown argument `firstName`. Available options are marked with ?.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.js[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2medge cases[2m > [22m[2mshould handle visitor with badge
[22m[39mprisma:error 
Invalid `prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/tests/helpers/factories.ts:174:25

  171 ) {
  172   const id = getUniqueId()
  173 
→ 174   return prisma.visitor.create({
          data: {
            name: "Visitor 39",
            organization: "Test Organization",
            visitType: "contractor",
            visitReason: "Test visit",
            kioskId: "KIOSK001",
            checkInMethod: "kiosk",
            badgeId: "23b70f6d-0736-46a8-8a63-a80643c20644",
            ~~~~~~~
        ?   id?: String,
        ?   checkInTime?: DateTime,
        ?   checkOutTime?: DateTime | Null,
        ?   createdAt?: DateTime | Null,
        ?   adminNotes?: String | Null,
        ?   admin_users?: AdminUserCreateNestedOneWithoutVisitorsInput,
        ?   event?: EventCreateNestedOneWithoutVisitorsInput,
        ?   hostMember?: MemberCreateNestedOneWithoutVisitorsInput,
        ?   badge?: BadgeCreateNestedOneWithoutVisitorsInput,
        ?   visitTypeRef?: VisitTypeCreateNestedOneWithoutVisitorsInput
          }
        })

Unknown argument `badgeId`. Did you mean `badge`? Available options are marked with ?.

 [31m❯[39m tests/integration/repositories/visitor-repository.test.js [2m([22m[2m35 tests[22m[2m | [22m[31m16 failed[39m[2m)[22m[33m 65938[2mms[22m[39m
[31m       [31m×[31m should create visitor with all required fields[39m[33m 1614[2mms[22m[39m
[31m       [31m×[31m should create visitor with host member[39m[33m 1797[2mms[22m[39m
[31m       [31m×[31m should create visitor for event[39m[33m 1663[2mms[22m[39m
[31m       [31m×[31m should default checkInTime to now if not provided[39m[33m 1539[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when host member does not exist [33m 1629[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when event does not exist [33m 1536[2mms[22m[39m
       [33m[2m✓[22m[39m should find visitor by ID with relations [33m 1448[2mms[22m[39m
[31m       [31m×[31m should return null when visitor does not exist[39m[33m 1451[2mms[22m[39m
       [33m[2m✓[22m[39m should find all visitors [33m 1509[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by visit type [33m 1450[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by host member [33m 1537[2mms[22m[39m
[31m       [31m×[31m should filter by date range[39m[33m 1524[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no matches [33m 1512[2mms[22m[39m
[31m       [31m×[31m should find visitors who have not checked out[39m[33m 1658[2mms[22m[39m
       [33m[2m✓[22m[39m should not include checked out visitors [33m 1741[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no active visitors [33m 1786[2mms[22m[39m
       [33m[2m✓[22m[39m should include host member name [33m 1792[2mms[22m[39m
       [33m[2m✓[22m[39m should include event name [33m 1857[2mms[22m[39m
[31m       [31m×[31m should update visitor details[39m[33m 1794[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when visitor does not exist [33m 1746[2mms[22m[39m
[31m       [31m×[31m should allow updating to null values[39m[33m 1780[2mms[22m[39m
       [33m[2m✓[22m[39m should set checkout time [33m 1755[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when visitor does not exist [33m 1844[2mms[22m[39m
       [33m[2m✓[22m[39m should allow checking out already checked out visitor [33m 1867[2mms[22m[39m
       [33m[2m✓[22m[39m should return count of active visitors [33m 1842[2mms[22m[39m
       [33m[2m✓[22m[39m should not count checked out visitors [33m 1797[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 when no active visitors [33m 1745[2mms[22m[39m
[31m       [31m×[31m should find visitor history with pagination[39m[33m 1804[2mms[22m[39m
[31m       [31m×[31m should filter by name[39m[33m 1823[2mms[22m[39m
[31m       [31m×[31m should filter by organization[39m[33m 1889[2mms[22m[39m
[31m       [31m×[31m should return empty when no matches[39m[33m 1806[2mms[22m[39m
[31m       [31m×[31m should handle pagination beyond available pages[39m[33m 1714[2mms[22m[39m
[31m       [31m×[31m should handle visitor with badge[39m[33m 1730[2mms[22m[39m
[31m       [31m×[31m should handle visitor without host or event[39m[33m 1825[2mms[22m[39m
       [33m[2m✓[22m[39m should handle multiple visitors with same host [33m 1800[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould create visitor with all required fields
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "John Visitor",
            organization: "Test Org",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: null,
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:33:36.788Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould create visitor with host member
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Jane Visitor",
            organization: "External",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: "bf0ddb4b-6936-4d2b-b8c0-3e350301e6a7",
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:33:38.559Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould create visitor for event
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Event Visitor",
            organization: "Event Org",
            visitType: "event",
            visitTypeId: null,
            hostMemberId: null,
            eventId: "392a0af8-2db9-46c6-93a8-d04843c1344d",
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:33:40.054Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould default checkInTime to now if not provided
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Auto Time Visitor",
            organization: "Test",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: null,
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:33:41.509Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when host member does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Visitor",
            organization: "Test",
            visitType: "official",
            visitTypeId: null,
            hostMemberId: "non-existent",
            eventId: null,
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:33:42.953Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when event does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:131:47

  128  * Create a new visitor
  129  */
  130 async create(data: CreateVisitorInput): Promise<Visitor> {
→ 131   const visitor = await this.prisma.visitor.create({
          data: {
            name: "Visitor",
            organization: "Test",
            visitType: "event",
            visitTypeId: null,
            hostMemberId: null,
            eventId: "non-existent",
            visitReason: null,
            checkInTime: new Date("2026-01-23T21:33:44.375Z"),
            checkOutTime: null,
            temporaryBadgeId: null,
            adminNotes: null,
            checkInMethod: null,
            createdByAdmin: null,
        +   kioskId: String
          },
          include: {
            event: true,
            hostMember: true,
            badge: true
          }
        })

Argument `kioskId` is missing.

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould return null when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:67:47

  64  * Find visitor by ID
  65  */
  66 async findById(id: string): Promise<Visitor | null> {
→ 67   const visitor = await this.prisma.visitor.findUnique(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:162:47

  159  * Update visitor details (event, host, purpose)
  160  */
  161 async update(id: string, data: UpdateVisitorInput): Promise<Visitor> {
→ 162   const visitor = await this.prisma.visitor.update(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

[90mstdout[2m | tests/integration/repositories/visitor-repository.test.ts[2m > [22m[2mVisitorRepository Integration Tests[2m > [22m[2mcheckout[2m > [22m[2mshould throw error when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:193:47

  190  * Checkout a visitor (set checkout time to now)
  191  */
  192 async checkout(id: string): Promise<Visitor> {
→ 193   const visitor = await this.prisma.visitor.update(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

 [31m❯[39m tests/integration/repositories/visitor-repository.test.ts [2m([22m[2m35 tests[22m[2m | [22m[31m13 failed[39m[2m)[22m[33m 64950[2mms[22m[39m
[31m       [31m×[31m should create visitor with all required fields[39m[33m 1997[2mms[22m[39m
[31m       [31m×[31m should create visitor with host member[39m[33m 1759[2mms[22m[39m
[31m       [31m×[31m should create visitor for event[39m[33m 1495[2mms[22m[39m
[31m       [31m×[31m should default checkInTime to now if not provided[39m[33m 1454[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when host member does not exist [33m 1446[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when event does not exist [33m 1421[2mms[22m[39m
       [33m[2m✓[22m[39m should find visitor by ID with relations [33m 1501[2mms[22m[39m
[31m       [31m×[31m should return null when visitor does not exist[39m[33m 1587[2mms[22m[39m
       [33m[2m✓[22m[39m should find all visitors [33m 1578[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by visit type [33m 1471[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by host member [33m 1490[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by date range [33m 1475[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no matches [33m 1451[2mms[22m[39m
       [33m[2m✓[22m[39m should find visitors who have not checked out [33m 1751[2mms[22m[39m
       [33m[2m✓[22m[39m should not include checked out visitors [33m 1772[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no active visitors [33m 1730[2mms[22m[39m
       [33m[2m✓[22m[39m should include host member name [33m 1746[2mms[22m[39m
       [33m[2m✓[22m[39m should include event name [33m 1755[2mms[22m[39m
[31m       [31m×[31m should update visitor details[39m[33m 1734[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when visitor does not exist [33m 1838[2mms[22m[39m
[31m       [31m×[31m should allow updating to null values[39m[33m 1875[2mms[22m[39m
       [33m[2m✓[22m[39m should set checkout time [33m 1806[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when visitor does not exist [33m 1758[2mms[22m[39m
       [33m[2m✓[22m[39m should allow checking out already checked out visitor [33m 1772[2mms[22m[39m
       [33m[2m✓[22m[39m should return count of active visitors [33m 1787[2mms[22m[39m
       [33m[2m✓[22m[39m should not count checked out visitors [33m 1838[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 when no active visitors [33m 1716[2mms[22m[39m
[31m       [31m×[31m should find visitor history with pagination[39m[33m 1754[2mms[22m[39m
[31m       [31m×[31m should filter by name[39m[33m 1710[2mms[22m[39m
[31m       [31m×[31m should filter by organization[39m[33m 1645[2mms[22m[39m
[31m       [31m×[31m should return empty when no matches[39m[33m 1756[2mms[22m[39m
[31m       [31m×[31m should handle pagination beyond available pages[39m[33m 1761[2mms[22m[39m
       [33m[2m✓[22m[39m should handle visitor with badge [33m 1803[2mms[22m[39m
[31m       [31m×[31m should handle visitor without host or event[39m[33m 1742[2mms[22m[39m
       [33m[2m✓[22m[39m should handle multiple visitors with same host [33m 1734[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/checkin-repository.test.js[2m > [22m[2mCheckinRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.js[2m > [22m[2mCheckinRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.js[2m > [22m[2mCheckinRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when member does not exist
[22m[39mprisma:error 
Invalid `this.prisma.checkin.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:290:47

  287 // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
  288 await this.invalidatePresenceCache()
  289 
→ 290 const checkin = await this.prisma.checkin.create(
Invalid input value: invalid input syntax for type uuid: "non-existent-member"

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.js[2m > [22m[2mCheckinRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.checkin.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:290:47

  287 // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
  288 await this.invalidatePresenceCache()
  289 
→ 290 const checkin = await this.prisma.checkin.create(
Invalid input value: invalid input syntax for type uuid: "non-existent-badge"

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.js[2m > [22m[2mCheckinRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould return null when checkin does not exist
[22m[39mprisma:error 
Invalid `this.prisma.checkin.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:194:47

  191  * Find checkin by ID
  192  */
  193 async findById(id: string): Promise<Checkin | null> {
→ 194   const checkin = await this.prisma.checkin.findUnique(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

 [31m❯[39m tests/integration/repositories/checkin-repository.test.js [2m([22m[2m33 tests[22m[2m | [22m[31m12 failed[39m[2m)[22m[33m 63385[2mms[22m[39m
       [33m[2m✓[22m[39m should create a checkin with all required fields [33m 1799[2mms[22m[39m
       [33m[2m✓[22m[39m should default synced to true if not provided [33m 1472[2mms[22m[39m
       [33m[2m✓[22m[39m should create checkin with OUT direction [33m 1468[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when member does not exist [33m 1644[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1624[2mms[22m[39m
       [33m[2m✓[22m[39m should find checkin by ID [33m 1521[2mms[22m[39m
[31m       [31m×[31m should return null when checkin does not exist[39m[33m 1399[2mms[22m[39m
       [33m[2m✓[22m[39m should find all checkins without filters [33m 1516[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by badge ID [33m 1583[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by kiosk ID [33m 1537[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by date range [33m 1618[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no matches [33m 1452[2mms[22m[39m
[31m       [31m×[31m should paginate checkins[39m[33m 1511[2mms[22m[39m
[31m       [31m×[31m should return second page of results[39m[33m 1825[2mms[22m[39m
[31m       [31m×[31m should sort by timestamp descending[39m[33m 1788[2mms[22m[39m
[31m       [31m×[31m should combine pagination with filters[39m[33m 1852[2mms[22m[39m
[31m       [31m×[31m should find latest checkin for a member[39m[33m 1929[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when member has no checkins [33m 1793[2mms[22m[39m
[31m       [31m×[31m should find latest checkins for multiple members[39m[33m 1815[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty map when no member IDs provided [33m 1804[2mms[22m[39m
[31m       [31m×[31m should skip members with no checkins[39m[33m 1892[2mms[22m[39m
       [33m[2m✓[22m[39m should return presence statistics [33m 1916[2mms[22m[39m
[31m       [31m×[31m should calculate correct present count[39m[33m 1895[2mms[22m[39m
       [33m[2m✓[22m[39m should return list of currently present members [33m 1840[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no one is present [33m 1803[2mms[22m[39m
[31m       [31m×[31m should return presence list for all members[39m[33m 1750[2mms[22m[39m
       [33m[2m✓[22m[39m should show absent status for members without checkins [33m 1786[2mms[22m[39m
       [33m[2m✓[22m[39m should return recent checkin activity [33m 1865[2mms[22m[39m
       [33m[2m✓[22m[39m should limit results to specified limit [33m 1908[2mms[22m[39m
       [33m[2m✓[22m[39m should order by timestamp descending [33m 1766[2mms[22m[39m
[31m       [31m×[31m should handle multiple checkins for same member[39m[33m 1789[2mms[22m[39m
       [33m[2m✓[22m[39m should handle checkins across different days [33m 1835[2mms[22m[39m
[31m       [31m×[31m should handle pagination beyond available pages[39m[33m 1871[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/checkin-repository.test.ts[2m > [22m[2mCheckinRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.ts[2m > [22m[2mCheckinRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.ts[2m > [22m[2mCheckinRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when member does not exist
[22m[39mprisma:error 
Invalid `this.prisma.checkin.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:290:47

  287 // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
  288 await this.invalidatePresenceCache()
  289 
→ 290 const checkin = await this.prisma.checkin.create(
Invalid input value: invalid input syntax for type uuid: "non-existent-member"

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.ts[2m > [22m[2mCheckinRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.checkin.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:290:47

  287 // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
  288 await this.invalidatePresenceCache()
  289 
→ 290 const checkin = await this.prisma.checkin.create(
Invalid input value: invalid input syntax for type uuid: "non-existent-badge"

[90mstdout[2m | tests/integration/repositories/checkin-repository.test.ts[2m > [22m[2mCheckinRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould return null when checkin does not exist
[22m[39mprisma:error 
Invalid `this.prisma.checkin.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:194:47

  191  * Find checkin by ID
  192  */
  193 async findById(id: string): Promise<Checkin | null> {
→ 194   const checkin = await this.prisma.checkin.findUnique(
Invalid input value: invalid input syntax for type uuid: "non-existent-id"

 [31m❯[39m tests/integration/repositories/checkin-repository.test.ts [2m([22m[2m33 tests[22m[2m | [22m[31m12 failed[39m[2m)[22m[33m 68775[2mms[22m[39m
       [33m[2m✓[22m[39m should create a checkin with all required fields [33m 2243[2mms[22m[39m
       [33m[2m✓[22m[39m should default synced to true if not provided [33m 1854[2mms[22m[39m
       [33m[2m✓[22m[39m should create checkin with OUT direction [33m 1832[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when member does not exist [33m 1785[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1840[2mms[22m[39m
       [33m[2m✓[22m[39m should find checkin by ID [33m 1834[2mms[22m[39m
[31m       [31m×[31m should return null when checkin does not exist[39m[33m 1849[2mms[22m[39m
       [33m[2m✓[22m[39m should find all checkins without filters [33m 1882[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by badge ID [33m 1750[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by kiosk ID [33m 1728[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by date range [33m 1771[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no matches [33m 1712[2mms[22m[39m
[31m       [31m×[31m should paginate checkins[39m[33m 1854[2mms[22m[39m
[31m       [31m×[31m should return second page of results[39m[33m 1804[2mms[22m[39m
[31m       [31m×[31m should sort by timestamp descending[39m[33m 1776[2mms[22m[39m
[31m       [31m×[31m should combine pagination with filters[39m[33m 1796[2mms[22m[39m
[31m       [31m×[31m should find latest checkin for a member[39m[33m 1758[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when member has no checkins [33m 1841[2mms[22m[39m
[31m       [31m×[31m should find latest checkins for multiple members[39m[33m 1864[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty map when no member IDs provided [33m 1710[2mms[22m[39m
[31m       [31m×[31m should skip members with no checkins[39m[33m 1766[2mms[22m[39m
       [33m[2m✓[22m[39m should return presence statistics [33m 1746[2mms[22m[39m
[31m       [31m×[31m should calculate correct present count[39m[33m 1791[2mms[22m[39m
       [33m[2m✓[22m[39m should return list of currently present members [33m 1857[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no one is present [33m 2463[2mms[22m[39m
[31m       [31m×[31m should return presence list for all members[39m[33m 2644[2mms[22m[39m
       [33m[2m✓[22m[39m should show absent status for members without checkins [33m 2402[2mms[22m[39m
       [33m[2m✓[22m[39m should return recent checkin activity [33m 1874[2mms[22m[39m
       [33m[2m✓[22m[39m should limit results to specified limit [33m 2004[2mms[22m[39m
       [33m[2m✓[22m[39m should order by timestamp descending [33m 1811[2mms[22m[39m
[31m       [31m×[31m should handle multiple checkins for same member[39m[33m 1800[2mms[22m[39m
       [33m[2m✓[22m[39m should handle checkins across different days [33m 1833[2mms[22m[39m
[31m       [31m×[31m should handle pagination beyond available pages[39m[33m 1931[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent CRUD - create[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `this.prisma.event.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:145:43

  142   data.createdBy &&
  143   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.createdBy)
  144 
→ 145 const event = await this.prisma.event.create(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent CRUD - update[2m > [22m[2mshould throw error when updating non-existent event
[22m[39mprisma:error 
Invalid `this.prisma.event.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:201:45

  198 updateData.updatedAt = new Date()
  199 
  200 try {
→ 201   const event = await this.prisma.event.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent CRUD - delete[2m > [22m[2mshould throw error when deleting non-existent event
[22m[39mprisma:error 
Invalid `this.prisma.event.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:220:31

  217  */
  218 async delete(id: string): Promise<void> {
  219   try {
→ 220     await this.prisma.event.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent Attendee - updateAttendee[2m > [22m[2mshould throw error when attendee not found
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:329:56

  326 updateData.updatedAt = new Date()
  327 
  328 try {
→ 329   const attendee = await this.prisma.eventAttendee.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mEvent Attendee - removeAttendee[2m > [22m[2mshould throw error when attendee not found
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:348:39

  345  */
  346 async removeAttendee(id: string): Promise<void> {
  347   try {
→ 348     await this.prisma.eventAttendee.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

[90mstdout[2m | tests/integration/repositories/event-repository.test.js[2m > [22m[2mEventRepository Integration Tests[2m > [22m[2mBadge Assignment - assignBadge[2m > [22m[2mshould throw error when attendee not found
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:368:56

  365  */
  366 async assignBadge(attendeeId: string, badgeId: string): Promise<EventAttendee> {
  367   try {
→ 368     const attendee = await this.prisma.eventAttendee.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

 [31m❯[39m tests/integration/repositories/event-repository.test.js [2m([22m[2m39 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 76603[2mms[22m[39m
       [33m[2m✓[22m[39m should create an event with all required fields [33m 1934[2mms[22m[39m
[31m       [31m×[31m should create event without description[39m[33m 1838[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when status is missing [33m 1806[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when autoExpireBadges is undefined [33m 1789[2mms[22m[39m
[31m       [31m×[31m should handle invalid createdBy UUID[39m[33m 1768[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1761[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no events exist [33m 1804[2mms[22m[39m
       [33m[2m✓[22m[39m should return all events sorted by startDate desc [33m 1866[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing event by ID [33m 1774[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when event does not exist [33m 1724[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing event by code [33m 1769[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1716[2mms[22m[39m
       [33m[2m✓[22m[39m should update event name [33m 1812[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 1858[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent event [33m 1746[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1783[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing event [33m 1695[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent event [33m 1720[2mms[22m[39m
       [33m[2m✓[22m[39m should add attendee with all fields [33m 1781[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when status is missing [33m 1729[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no attendees [33m 1684[2mms[22m[39m
       [33m[2m✓[22m[39m should return all attendees sorted by name [33m 1703[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing attendee [33m 1763[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when attendee does not exist [33m 1748[2mms[22m[39m
       [33m[2m✓[22m[39m should update attendee fields [33m 1840[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when attendee not found [33m 1788[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1826[2mms[22m[39m
       [33m[2m✓[22m[39m should remove existing attendee [33m 1735[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when attendee not found [33m 1771[2mms[22m[39m
       [33m[2m✓[22m[39m should assign badge to attendee [33m 1903[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when attendee not found [33m 1844[2mms[22m[39m
[31m       [31m×[31m should unassign badge from attendee[39m[33m 1846[2mms[22m[39m
       [33m[2m✓[22m[39m should return statistics for event [33m 2026[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when no attendees [33m 1973[2mms[22m[39m
       [33m[2m✓[22m[39m should return only active attendees [33m 1788[2mms[22m[39m
       [33m[2m✓[22m[39m should record check-in [33m 1893[2mms[22m[39m
       [33m[2m✓[22m[39m should return checkin history sorted by timestamp desc [33m 1782[2mms[22m[39m
       [33m[2m✓[22m[39m should return last checkin direction [33m 1816[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when no checkins [33m 1808[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/badge-repository.test.js[2m > [22m[2mBadgeRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/badge-repository.test.js[2m > [22m[2mBadgeRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/badge-repository.test.js[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate serial number
[22m[39mprisma:error 
Invalid `this.prisma.badge.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:288:43

  285   throw new Error('Serial number is required')
  286 }
  287 
→ 288 const badge = await this.prisma.badge.create(
Unique constraint failed on the fields: (`serial_number`)

[90mstdout[2m | tests/integration/repositories/badge-repository.test.js[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2massign[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:312:43

  309   throw new Error('Cannot assign badge with type "unassigned"')
  310 }
  311 
→ 312 const badge = await this.prisma.badge.update(
Invalid input value: invalid input syntax for type uuid: "member-id"

[90mstdout[2m | tests/integration/repositories/badge-repository.test.js[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2munassign[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:328:43

  325  * Unassign badge
  326  */
  327 async unassign(badgeId: string): Promise<Badge> {
→ 328   const badge = await this.prisma.badge.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/badge-repository.test.js[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2mupdateStatus[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:344:43

  341  * Update badge status
  342  */
  343 async updateStatus(badgeId: string, status: BadgeStatus): Promise<Badge> {
→ 344   const badge = await this.prisma.badge.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/badge-repository.test.js[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:359:29

  356  * Delete a badge
  357  */
  358 async delete(badgeId: string): Promise<void> {
→ 359   await this.prisma.badge.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [31m❯[39m tests/integration/repositories/badge-repository.test.js [2m([22m[2m29 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 56209[2mms[22m[39m
[31m       [31m×[31m should create a badge with all fields[39m[33m 1607[2mms[22m[39m
       [33m[2m✓[22m[39m should create a badge with defaults [33m 1429[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when serial number is missing [33m 1505[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate serial number [33m 1630[2mms[22m[39m
       [33m[2m✓[22m[39m should find badge by ID [33m 1632[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when badge does not exist [33m 1527[2mms[22m[39m
       [33m[2m✓[22m[39m should find badge by serial number [33m 1469[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when serial number does not exist [33m 1452[2mms[22m[39m
       [33m[2m✓[22m[39m should find multiple badges by serial numbers [33m 1439[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no serial numbers provided [33m 1433[2mms[22m[39m
       [33m[2m✓[22m[39m should skip non-existent serial numbers [33m 1561[2mms[22m[39m
       [33m[2m✓[22m[39m should find all badges without filters [33m 1491[2mms[22m[39m
       [33m[2m✓[22m[39m should filter badges by status [33m 1428[2mms[22m[39m
       [33m[2m✓[22m[39m should filter badges by assignment type [33m 2584[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by both status and assignment type [33m 2272[2mms[22m[39m
       [33m[2m✓[22m[39m should assign badge to a member [33m 1841[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when assigning with unassigned type [33m 1786[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1764[2mms[22m[39m
[31m       [31m×[31m should unassign badge[39m[33m 1844[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1752[2mms[22m[39m
       [33m[2m✓[22m[39m should update badge status [33m 1744[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1820[2mms[22m[39m
       [33m[2m✓[22m[39m should delete badge [33m 1832[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1783[2mms[22m[39m
       [33m[2m✓[22m[39m should find badge with assigned member [33m 1829[2mms[22m[39m
       [33m[2m✓[22m[39m should return null member when badge is unassigned [33m 1884[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when serial number does not exist [33m 1985[2mms[22m[39m
       [33m[2m✓[22m[39m should find all badges with member and scan details [33m 1917[2mms[22m[39m
       [33m[2m✓[22m[39m should apply status filter to details query [33m 1740[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.ts[2m > [22m[2mBadgeStatusRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.ts[2m > [22m[2mBadgeStatusRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.ts[2m > [22m[2mBadgeStatusRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "badge_statuses_code_key"`

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.ts[2m > [22m[2mBadgeStatusRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.ts[2m > [22m[2mBadgeStatusRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "badge_statuses_code_key"`

 [31m❯[39m tests/integration/repositories/badge-status-repository.test.ts [2m([22m[2m27 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 49982[2mms[22m[39m
[31m       [31m×[31m should create a badge status with all fields[39m[33m 1719[2mms[22m[39m
       [33m[2m✓[22m[39m should create badge status without optional fields [33m 1420[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1422[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no statuses exist [33m 1485[2mms[22m[39m
       [33m[2m✓[22m[39m should return all statuses ordered by name [33m 1448[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing badge status by ID [33m 1456[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when status does not exist [33m 1583[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 1487[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing badge status by code [33m 1509[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1422[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 1459[2mms[22m[39m
       [33m[2m✓[22m[39m should update status code [33m 1404[2mms[22m[39m
       [33m[2m✓[22m[39m should update status name [33m 1475[2mms[22m[39m
[31m       [31m×[31m should update multiple fields[39m[33m 1738[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 1740[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent status [33m 1721[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1737[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1676[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing badge status [33m 1797[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent status [33m 1787[2mms[22m[39m
       [33m[2m✓[22m[39m should prevent deletion when status is in use [33m 1813[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for status with no badges [33m 1756[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for status with badges [33m 1746[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent status [33m 1757[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long status names [33m 1840[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 1797[2mms[22m[39m
[31m       [31m×[31m should handle hex color formats[39m[33m 1726[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/badge-repository.test.ts[2m > [22m[2mBadgeRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/badge-repository.test.ts[2m > [22m[2mBadgeRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/badge-repository.test.ts[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate serial number
[22m[39mprisma:error 
Invalid `this.prisma.badge.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:288:43

  285   throw new Error('Serial number is required')
  286 }
  287 
→ 288 const badge = await this.prisma.badge.create(
Unique constraint failed on the fields: (`serial_number`)

[90mstdout[2m | tests/integration/repositories/badge-repository.test.ts[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2massign[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:312:43

  309   throw new Error('Cannot assign badge with type "unassigned"')
  310 }
  311 
→ 312 const badge = await this.prisma.badge.update(
Invalid input value: invalid input syntax for type uuid: "member-id"

[90mstdout[2m | tests/integration/repositories/badge-repository.test.ts[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2munassign[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:328:43

  325  * Unassign badge
  326  */
  327 async unassign(badgeId: string): Promise<Badge> {
→ 328   const badge = await this.prisma.badge.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/badge-repository.test.ts[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2mupdateStatus[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:344:43

  341  * Update badge status
  342  */
  343 async updateStatus(badgeId: string, status: BadgeStatus): Promise<Badge> {
→ 344   const badge = await this.prisma.badge.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/badge-repository.test.ts[2m > [22m[2mBadgeRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:359:29

  356  * Delete a badge
  357  */
  358 async delete(badgeId: string): Promise<void> {
→ 359   await this.prisma.badge.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [31m❯[39m tests/integration/repositories/badge-repository.test.ts [2m([22m[2m29 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 58920[2mms[22m[39m
[31m       [31m×[31m should create a badge with all fields[39m[33m 2202[2mms[22m[39m
       [33m[2m✓[22m[39m should create a badge with defaults [33m 1955[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when serial number is missing [33m 1748[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate serial number [33m 1794[2mms[22m[39m
       [33m[2m✓[22m[39m should find badge by ID [33m 1914[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when badge does not exist [33m 1820[2mms[22m[39m
       [33m[2m✓[22m[39m should find badge by serial number [33m 1790[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when serial number does not exist [33m 1777[2mms[22m[39m
       [33m[2m✓[22m[39m should find multiple badges by serial numbers [33m 1852[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no serial numbers provided [33m 1762[2mms[22m[39m
       [33m[2m✓[22m[39m should skip non-existent serial numbers [33m 1788[2mms[22m[39m
       [33m[2m✓[22m[39m should find all badges without filters [33m 1787[2mms[22m[39m
       [33m[2m✓[22m[39m should filter badges by status [33m 1723[2mms[22m[39m
       [33m[2m✓[22m[39m should filter badges by assignment type [33m 1720[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by both status and assignment type [33m 1746[2mms[22m[39m
       [33m[2m✓[22m[39m should assign badge to a member [33m 1812[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when assigning with unassigned type [33m 1757[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1734[2mms[22m[39m
[31m       [31m×[31m should unassign badge[39m[33m 1816[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1692[2mms[22m[39m
       [33m[2m✓[22m[39m should update badge status [33m 1738[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1853[2mms[22m[39m
       [33m[2m✓[22m[39m should delete badge [33m 1780[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when badge does not exist [33m 1762[2mms[22m[39m
       [33m[2m✓[22m[39m should find badge with assigned member [33m 1895[2mms[22m[39m
       [33m[2m✓[22m[39m should return null member when badge is unassigned [33m 1771[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when serial number does not exist [33m 1859[2mms[22m[39m
       [33m[2m✓[22m[39m should find all badges with member and scan details [33m 1969[2mms[22m[39m
       [33m[2m✓[22m[39m should apply status filter to details query [33m 1791[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.js[2m > [22m[2mVisitTypeRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.js[2m > [22m[2mVisitTypeRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.js[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "visit_types_code_key"`

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.js[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.js[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "visit_types_code_key"`

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.js[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould prevent deletion when type is in use
[22m[39mprisma:error 
Invalid `testDb.prisma!.visitor.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/tests/integration/repositories/visit-type-repository.test.ts:263:36

  260   },
  261 })
  262 
→ 263 await testDb.prisma!.visitor.create({
        data: {
          firstName: "John",
          lastName: "Visitor",
          organization: "External",
          visitTypeId: "223e9893-c4d2-4edc-9f9a-b9d7f6e40ab6",
          hostMemberId: "6dafc69a-f794-4e7e-b782-5cefa54a5d10",
          checkInTime: new Date("2026-01-23T21:41:35.784Z"),
          expectedDuration: 60,
      +   name: String
        }
      })

Argument `name` is missing.

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.js[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mgetUsageCount[2m > [22m[2mshould return correct count for type with visitors
[22m[39mprisma:error 
Invalid `testDb.prisma!.visitor.createMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/tests/integration/repositories/visit-type-repository.test.ts:317:36

  314   },
  315 })
  316 
→ 317 await testDb.prisma!.visitor.createMany({
        data: [
          {
            firstName: "John",
            lastName: "Visitor",
            organization: "External",
            visitTypeId: "322a0ee7-b1b0-4825-b667-232c1e807ae6",
            hostMemberId: "ab2c916e-ab26-402b-87ef-c424074887e6",
            checkInTime: new Date("2026-01-23T21:41:39.432Z"),
            expectedDuration: 60
          },
          {
            firstName: "Jane",
            lastName: "Guest",
            organization: "External",
            visitTypeId: "322a0ee7-b1b0-4825-b667-232c1e807ae6",
            hostMemberId: "ab2c916e-ab26-402b-87ef-c424074887e6",
            checkInTime: new Date("2026-01-23T21:41:39.432Z"),
            expectedDuration: 120
          }
        ]
      })

Argument `name` is missing.

 [31m❯[39m tests/integration/repositories/visit-type-repository.test.js [2m([22m[2m27 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 55474[2mms[22m[39m
       [33m[2m✓[22m[39m should create a visit type with all fields [33m 1848[2mms[22m[39m
       [33m[2m✓[22m[39m should create visit type without optional fields [33m 1719[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1887[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no types exist [33m 1961[2mms[22m[39m
       [33m[2m✓[22m[39m should return all types ordered by name [33m 1912[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing visit type by ID [33m 1788[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when type does not exist [33m 1759[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 1740[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing visit type by code [33m 1777[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1828[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 1872[2mms[22m[39m
       [33m[2m✓[22m[39m should update type code [33m 1855[2mms[22m[39m
       [33m[2m✓[22m[39m should update type name [33m 1748[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 1790[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 1759[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent type [33m 1818[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1812[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1746[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing visit type [33m 1842[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent type [33m 1766[2mms[22m[39m
[31m       [31m×[31m should prevent deletion when type is in use[39m[33m 1779[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for type with no visitors [33m 1851[2mms[22m[39m
[31m       [31m×[31m should return correct count for type with visitors[39m[33m 1790[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent type [33m 1713[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long type names [33m 1746[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 1755[2mms[22m[39m
       [33m[2m✓[22m[39m should handle hex color formats [33m 1734[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/member-type-repository.test.ts[2m > [22m[2mMemberTypeRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.ts[2m > [22m[2mMemberTypeRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.ts[2m > [22m[2mMemberTypeRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_types_code_key"`

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.ts[2m > [22m[2mMemberTypeRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.ts[2m > [22m[2mMemberTypeRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_types_code_key"`

 [31m❯[39m tests/integration/repositories/member-type-repository.test.ts [2m([22m[2m27 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 49981[2mms[22m[39m
[31m       [31m×[31m should create a member type with all fields[39m[33m 1702[2mms[22m[39m
       [33m[2m✓[22m[39m should create member type without optional fields [33m 1442[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1550[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no types exist [33m 1563[2mms[22m[39m
       [33m[2m✓[22m[39m should return all types ordered by name [33m 1465[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member type by ID [33m 1410[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when type does not exist [33m 1417[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 1395[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member type by code [33m 1549[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1753[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 1725[2mms[22m[39m
       [33m[2m✓[22m[39m should update type code [33m 1438[2mms[22m[39m
       [33m[2m✓[22m[39m should update type name [33m 1438[2mms[22m[39m
[31m       [31m×[31m should update multiple fields[39m[33m 1597[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 1785[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent type [33m 1848[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1820[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1755[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing member type [33m 1806[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent type [33m 1735[2mms[22m[39m
       [33m[2m✓[22m[39m should prevent deletion when type is in use [33m 1828[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for type with no members [33m 1809[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for type with members [33m 1691[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent type [33m 1683[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long type names [33m 1710[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 1679[2mms[22m[39m
[31m       [31m×[31m should handle hex color formats[39m[33m 1739[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/member-type-repository.test.js[2m > [22m[2mMemberTypeRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.js[2m > [22m[2mMemberTypeRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.js[2m > [22m[2mMemberTypeRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_types_code_key"`

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.js[2m > [22m[2mMemberTypeRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/member-type-repository.test.js[2m > [22m[2mMemberTypeRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_types_code_key"`

 [31m❯[39m tests/integration/repositories/member-type-repository.test.js [2m([22m[2m27 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 53319[2mms[22m[39m
[31m       [31m×[31m should create a member type with all fields[39m[33m 1592[2mms[22m[39m
       [33m[2m✓[22m[39m should create member type without optional fields [33m 1446[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1513[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no types exist [33m 1538[2mms[22m[39m
       [33m[2m✓[22m[39m should return all types ordered by name [33m 1458[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member type by ID [33m 1434[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when type does not exist [33m 1383[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 1563[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member type by code [33m 1558[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1584[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 1502[2mms[22m[39m
       [33m[2m✓[22m[39m should update type code [33m 1426[2mms[22m[39m
       [33m[2m✓[22m[39m should update type name [33m 1422[2mms[22m[39m
[31m       [31m×[31m should update multiple fields[39m[33m 1724[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 1723[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent type [33m 1796[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1820[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1850[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing member type [33m 1989[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent type [33m 1841[2mms[22m[39m
       [33m[2m✓[22m[39m should prevent deletion when type is in use [33m 1817[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for type with no members [33m 1892[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for type with members [33m 2622[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent type [33m 2331[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long type names [33m 2592[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 2426[2mms[22m[39m
[31m       [31m×[31m should handle hex color formats[39m[33m 1780[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.ts[2m > [22m[2mVisitTypeRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.ts[2m > [22m[2mVisitTypeRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.ts[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "visit_types_code_key"`

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.ts[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.ts[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "visit_types_code_key"`

[90mstdout[2m | tests/integration/repositories/visit-type-repository.test.ts[2m > [22m[2mVisitTypeRepository Integration Tests[2m > [22m[2mgetUsageCount[2m > [22m[2mshould return correct count for type with visitors
[22m[39mprisma:error 
Invalid `testDb.prisma!.visitor.createMany()` invocation in
/home/sauk/projects/sentinel/apps/backend/tests/integration/repositories/visit-type-repository.test.ts:317:36

  314   },
  315 })
  316 
→ 317 await testDb.prisma!.visitor.createMany({
        data: [
          {
            name: "John Visitor",
            organization: "External",
            visitType: "guest",
            visitTypeId: "49d5aba6-6041-418e-be77-c5d3f3f0a39d",
            hostMemberId: "d410a1af-2969-4769-99b2-bd8e0e283d71",
            kioskId: "KIOSK_TEST",
            checkInTime: new Date("2026-01-23T21:44:18.905Z")
          },
          {
            name: "Jane Guest",
            organization: "External",
            visitType: "guest",
            visitTypeId: "49d5aba6-6041-418e-be77-c5d3f3f0a39d",
            hostMemberId: "d410a1af-2969-4769-99b2-bd8e0e283d71",
            kioskId: "KIOSK_TEST",
            checkInTime: new Date("2026-01-23T21:44:18.905Z"),
            expectedDuration: 120
          }
        ]
      })

Unknown argument `expectedDuration`. Available options are marked with ?.

 [31m❯[39m tests/integration/repositories/visit-type-repository.test.ts [2m([22m[2m27 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 54848[2mms[22m[39m
       [33m[2m✓[22m[39m should create a visit type with all fields [33m 2047[2mms[22m[39m
       [33m[2m✓[22m[39m should create visit type without optional fields [33m 1699[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1733[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no types exist [33m 1799[2mms[22m[39m
       [33m[2m✓[22m[39m should return all types ordered by name [33m 1762[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing visit type by ID [33m 1804[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when type does not exist [33m 1792[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 1719[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing visit type by code [33m 1752[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1752[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 1759[2mms[22m[39m
       [33m[2m✓[22m[39m should update type code [33m 1778[2mms[22m[39m
       [33m[2m✓[22m[39m should update type name [33m 1764[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 1772[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 1755[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent type [33m 1749[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1742[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2146[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing visit type [33m 1991[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent type [33m 2175[2mms[22m[39m
       [33m[2m✓[22m[39m should prevent deletion when type is in use [33m 1906[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for type with no visitors [33m 2058[2mms[22m[39m
[31m       [31m×[31m should return correct count for type with visitors[39m[33m 1998[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent type [33m 1761[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long type names [33m 1757[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 1685[2mms[22m[39m
       [33m[2m✓[22m[39m should handle hex color formats [33m 1747[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.js[2m > [22m[2mBadgeStatusRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.js[2m > [22m[2mBadgeStatusRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.js[2m > [22m[2mBadgeStatusRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "badge_statuses_code_key"`

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.js[2m > [22m[2mBadgeStatusRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/badge-status-repository.test.js[2m > [22m[2mBadgeStatusRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "badge_statuses_code_key"`

 [31m❯[39m tests/integration/repositories/badge-status-repository.test.js [2m([22m[2m27 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 62014[2mms[22m[39m
[31m       [31m×[31m should create a badge status with all fields[39m[33m 1724[2mms[22m[39m
       [33m[2m✓[22m[39m should create badge status without optional fields [33m 2016[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1631[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no statuses exist [33m 1624[2mms[22m[39m
       [33m[2m✓[22m[39m should return all statuses ordered by name [33m 1818[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing badge status by ID [33m 1737[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when status does not exist [33m 1530[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 1970[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing badge status by code [33m 1906[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1494[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 1811[2mms[22m[39m
       [33m[2m✓[22m[39m should update status code [33m 1878[2mms[22m[39m
       [33m[2m✓[22m[39m should update status name [33m 1706[2mms[22m[39m
[31m       [31m×[31m should update multiple fields[39m[33m 2415[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 2608[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent status [33m 2317[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 2071[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2344[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing badge status [33m 2592[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent status [33m 1979[2mms[22m[39m
       [33m[2m✓[22m[39m should prevent deletion when status is in use [33m 2407[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for status with no badges [33m 2113[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for status with badges [33m 2129[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent status [33m 2535[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long status names [33m 2143[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 2350[2mms[22m[39m
[31m       [31m×[31m should handle hex color formats[39m[33m 2270[2mms[22m[39m
[90mstdout[2m | tests/integration/services/member-service.test.ts[2m > [22m[2mMemberService Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/services/member-service.test.ts[2m > [22m[2mMemberService Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

 [31m❯[39m tests/integration/services/member-service.test.ts [2m([22m[2m23 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 54443[2mms[22m[39m
       [33m[2m✓[22m[39m should find member by ID with division [33m 2417[2mms[22m[39m
       [33m[2m✓[22m[39m should return null for non-existent ID [33m 2290[2mms[22m[39m
       [33m[2m✓[22m[39m should throw ValidationError for empty ID [33m 1878[2mms[22m[39m
       [33m[2m✓[22m[39m should find member by service number [33m 2120[2mms[22m[39m
       [33m[2m✓[22m[39m should return null for non-existent service number [33m 2154[2mms[22m[39m
       [33m[2m✓[22m[39m should throw ValidationError for empty service number [33m 1759[2mms[22m[39m
       [33m[2m✓[22m[39m should create a new member [33m 2118[2mms[22m[39m
       [33m[2m✓[22m[39m should throw ValidationError for missing required fields [33m 1780[2mms[22m[39m
       [33m[2m✓[22m[39m should throw ConflictError for duplicate service number [33m 1912[2mms[22m[39m
       [33m[2m✓[22m[39m should create member with badge assignment [33m 2172[2mms[22m[39m
       [33m[2m✓[22m[39m should throw NotFoundError for non-existent badge [33m 1814[2mms[22m[39m
       [33m[2m✓[22m[39m should update member successfully [33m 1978[2mms[22m[39m
       [33m[2m✓[22m[39m should throw NotFoundError for non-existent member [33m 1962[2mms[22m[39m
       [33m[2m✓[22m[39m should handle badge reassignment [33m 1918[2mms[22m[39m
[31m       [31m×[31m should deactivate member and unassign badge[39m[33m 1831[2mms[22m[39m
[31m       [31m×[31m should return presence status based on last checkin[39m[33m 2110[2mms[22m[39m
[31m       [31m×[31m should return false when last checkin is out[39m[33m 1855[2mms[22m[39m
       [33m[2m✓[22m[39m should assign badge to member [33m 1791[2mms[22m[39m
       [33m[2m✓[22m[39m should throw ConflictError for already assigned badge [33m 1778[2mms[22m[39m
       [33m[2m✓[22m[39m should unassign badge from member [33m 2136[2mms[22m[39m
       [33m[2m✓[22m[39m should throw ValidationError when member has no badge [33m 1879[2mms[22m[39m
       [33m[2m✓[22m[39m should return paginated results [33m 1907[2mms[22m[39m
       [33m[2m✓[22m[39m should validate pagination parameters [33m 1850[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/audit-repository.test.ts[2m > [22m[2mAuditRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/audit-repository.test.ts[2m > [22m[2mAuditRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/audit-repository.test.ts[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2mlog[2m > [22m[2mshould create audit log with all fields
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "member-123"

[90mstdout[2m | tests/integration/repositories/audit-repository.test.ts[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2mlog[2m > [22m[2mshould log system action without admin user
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "user-456"

[90mstdout[2m | tests/integration/repositories/audit-repository.test.ts[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2mfindAll[2m > [22m[2mshould filter by entity ID
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "member-123"

[90mstdout[2m | tests/integration/repositories/audit-repository.test.ts[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2medge cases[2m > [22m[2mshould combine multiple filters
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "member-123"

 [31m❯[39m tests/integration/repositories/audit-repository.test.ts [2m([22m[2m20 tests[22m[2m | [22m[31m20 failed[39m[2m)[22m[33m 47763[2mms[22m[39m
[31m       [31m×[31m should create audit log with all fields[39m[33m 2491[2mms[22m[39m
[31m       [31m×[31m should log system action without admin user[39m[33m 1978[2mms[22m[39m
[31m       [31m×[31m should log different audit actions[39m[33m 2121[2mms[22m[39m
[31m       [31m×[31m should handle empty details object[39m[33m 1992[2mms[22m[39m
[31m       [31m×[31m should handle complex details object[39m[33m 1793[2mms[22m[39m
[31m       [31m×[31m should find all audit logs with pagination[39m[33m 1776[2mms[22m[39m
[31m       [31m×[31m should filter by action[39m[33m 2079[2mms[22m[39m
[31m       [31m×[31m should filter by multiple actions[39m[33m 1911[2mms[22m[39m
[31m       [31m×[31m should filter by actor (admin user)[39m[33m 1872[2mms[22m[39m
[31m       [31m×[31m should filter by entity ID[39m[33m 2100[2mms[22m[39m
[31m       [31m×[31m should filter by date range[39m[33m 2053[2mms[22m[39m
[31m       [31m×[31m should return empty array when no matches[39m[33m 1897[2mms[22m[39m
[31m       [31m×[31m should order by createdAt descending[39m[33m 2287[2mms[22m[39m
[31m       [31m×[31m should count all audit logs[39m[33m 1937[2mms[22m[39m
[31m       [31m×[31m should count with filters[39m[33m 1858[2mms[22m[39m
[31m       [31m×[31m should return 0 when no matches[39m[33m 2171[2mms[22m[39m
[31m       [31m×[31m should count with date range filter[39m[33m 2318[2mms[22m[39m
[31m       [31m×[31m should handle pagination beyond available records[39m[33m 2072[2mms[22m[39m
[31m       [31m×[31m should combine multiple filters[39m[33m 1780[2mms[22m[39m
[31m       [31m×[31m should handle different IP addresses[39m[33m 1892[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/audit-repository.test.js[2m > [22m[2mAuditRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/audit-repository.test.js[2m > [22m[2mAuditRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/audit-repository.test.js[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2mlog[2m > [22m[2mshould create audit log with all fields
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "member-123"

[90mstdout[2m | tests/integration/repositories/audit-repository.test.js[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2mlog[2m > [22m[2mshould log system action without admin user
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "user-456"

[90mstdout[2m | tests/integration/repositories/audit-repository.test.js[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2mfindAll[2m > [22m[2mshould filter by entity ID
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "member-123"

[90mstdout[2m | tests/integration/repositories/audit-repository.test.js[2m > [22m[2mAuditRepository Integration Tests[2m > [22m[2medge cases[2m > [22m[2mshould combine multiple filters
[22m[39mprisma:error 
Invalid `this.prisma.auditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/audit-repository.ts:75:32

  72 }
  73 
  74 async log(entry: AuditLogEntry): Promise<void> {
→ 75   await this.prisma.auditLog.create(
Invalid input value: invalid input syntax for type uuid: "member-123"

 [31m❯[39m tests/integration/repositories/audit-repository.test.js [2m([22m[2m20 tests[22m[2m | [22m[31m20 failed[39m[2m)[22m[33m 72439[2mms[22m[39m
[31m       [31m×[31m should create audit log with all fields[39m[33m 4070[2mms[22m[39m
[31m       [31m×[31m should log system action without admin user[39m[33m 3280[2mms[22m[39m
[31m       [31m×[31m should log different audit actions[39m[33m 2219[2mms[22m[39m
[31m       [31m×[31m should handle empty details object[39m[33m 2690[2mms[22m[39m
[31m       [31m×[31m should handle complex details object[39m[33m 3130[2mms[22m[39m
[31m       [31m×[31m should find all audit logs with pagination[39m[33m 3158[2mms[22m[39m
[31m       [31m×[31m should filter by action[39m[33m 3097[2mms[22m[39m
[31m       [31m×[31m should filter by multiple actions[39m[33m 2598[2mms[22m[39m
[31m       [31m×[31m should filter by actor (admin user)[39m[33m 2165[2mms[22m[39m
[31m       [31m×[31m should filter by entity ID[39m[33m 2670[2mms[22m[39m
[31m       [31m×[31m should filter by date range[39m[33m 2170[2mms[22m[39m
[31m       [31m×[31m should return empty array when no matches[39m[33m 3097[2mms[22m[39m
[31m       [31m×[31m should order by createdAt descending[39m[33m 3452[2mms[22m[39m
[31m       [31m×[31m should count all audit logs[39m[33m 2504[2mms[22m[39m
[31m       [31m×[31m should count with filters[39m[33m 2852[2mms[22m[39m
[31m       [31m×[31m should return 0 when no matches[39m[33m 3057[2mms[22m[39m
[31m       [31m×[31m should count with date range filter[39m[33m 3983[2mms[22m[39m
[31m       [31m×[31m should handle pagination beyond available records[39m[33m 4469[2mms[22m[39m
[31m       [31m×[31m should combine multiple filters[39m[33m 4036[2mms[22m[39m
[31m       [31m×[31m should handle different IP addresses[39m[33m 3977[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/dds.test.ts[2m > [22m[2mDDS Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/dds.test.ts[2m > [22m[2mDDS Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/routes/dds.test.ts[2m > [22m[2mDDS Routes Integration Tests[2m > [22m[2mPOST /api/dds/assign[2m > [22m[2mshould return 200 and create DDS assignment
[22m[39mprisma:error 
Invalid `this.prisma.ddsAssignment.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/services/dds-service.ts:240:56

  237   throw new ConflictError('A DDS has already been assigned for today')
  238 }
  239 
→ 240 const assignment = await this.prisma.ddsAssignment.create(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/routes/dds.test.ts[2m > [22m[2mDDS Routes Integration Tests[2m > [22m[2mPOST /api/dds/transfer[2m > [22m[2mshould return 200 and transfer DDS to new member
[22m[39mprisma:error 
Invalid `this.prisma.ddsAssignment.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/services/dds-service.ts:327:33

  324     releasedAt: new Date(),
  325   },
  326 }),
→ 327 this.prisma.ddsAssignment.create(
Invalid input value: invalid input syntax for type uuid: "system"

[90mstdout[2m | tests/integration/routes/dds.test.ts[2m > [22m[2mDDS Routes Integration Tests[2m > [22m[2mPOST /api/dds/release[2m > [22m[2mshould return 200 and release DDS
[22m[39mprisma:error 
Invalid `this.prisma.responsibilityAuditLog.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/services/dds-service.ts:399:46

  396   },
  397 })
  398 
→ 399 await this.prisma.responsibilityAuditLog.create(
Invalid input value: invalid input syntax for type uuid: "system"

 [31m❯[39m tests/integration/routes/dds.test.ts [2m([22m[2m19 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 63148[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with null when no DDS assigned for today [33m 3518[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with DDS data when assigned for today [33m 2500[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with exists: false when no DDS for today [33m 2492[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with exists: true when DDS exists for today [33m 2741[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no audit entries [33m 2772[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with audit log entries [33m 2741[2mms[22m[39m
       [33m[2m✓[22m[39m should support limit query parameter [33m 2593[2mms[22m[39m
[31m       [31m×[31m should return 200 and create DDS assignment[39m[33m 2593[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when DDS already exists for today [33m 2746[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when member does not exist [33m 2797[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and create DDS when member accepts [33m 2592[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when DDS already exists for today [33m 2498[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when member does not exist [33m 2533[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for invalid UUID format [33m 2628[2mms[22m[39m
[31m       [31m×[31m should return 200 and transfer DDS to new member[39m[33m 3003[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when no active DDS exists for today [33m 2584[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when target member does not exist [33m 2705[2mms[22m[39m
[31m       [31m×[31m should return 200 and release DDS[39m[33m 3080[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when no active DDS exists for today [33m 2695[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/checkins.test.ts[2m > [22m[2mCheckins Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/checkins.test.ts[2m > [22m[2mCheckins Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/routes/checkins.test.ts[2m > [22m[2mCheckins Routes Integration Tests[2m > [22m[2mPOST /api/checkins[2m > [22m[2mshould return 404 for non-existent member
[22m[39mprisma:error 
Invalid `this.prisma.checkin.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:290:47

  287 // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
  288 await this.invalidatePresenceCache()
  289 
→ 290 const checkin = await this.prisma.checkin.create(
Foreign key constraint violated on the constraint: `checkins_member_id_fkey`

[90mstdout[2m | tests/integration/routes/checkins.test.ts[2m > [22m[2mCheckins Routes Integration Tests[2m > [22m[2mPOST /api/checkins/bulk[2m > [22m[2mshould handle partial failures in bulk create
[22m[39mprisma:error 
Invalid `this.prisma.checkin.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/checkin-repository.ts:290:47

  287 // HIGH-15 FIX: Invalidate cache BEFORE insert to prevent race condition
  288 await this.invalidatePresenceCache()
  289 
→ 290 const checkin = await this.prisma.checkin.create(
Foreign key constraint violated on the constraint: `checkins_member_id_fkey`

 [31m❯[39m tests/integration/routes/checkins.test.ts [2m([22m[2m20 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 68427[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no checkins exist [33m 3929[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with paginated checkins list [33m 3523[2mms[22m[39m
       [33m[2m✓[22m[39m should support pagination query parameters [33m 3795[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by memberId [33m 2928[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by date range [33m 3225[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with checkin data when checkin exists [33m 2653[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when checkin does not exist [33m 2978[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and create checkin with valid data [33m 2618[2mms[22m[39m
       [33m[2m✓[22m[39m should accept custom timestamp [33m 2780[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for missing required fields [33m 2629[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 for non-existent member [33m 2634[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and create multiple checkins [33m 2992[2mms[22m[39m
[31m       [31m×[31m should handle partial failures in bulk create[39m[33m 2601[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and update checkin direction [33m 2588[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when checkin does not exist [33m 2929[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and delete checkin [33m 2615[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when checkin does not exist [33m 2580[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with presence statistics [33m 2729[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with member checkins [33m 2594[2mms[22m[39m
       [33m[2m✓[22m[39m should support pagination for member checkins [33m 3039[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/divisions.test.ts[2m > [22m[2mDivisions Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/divisions.test.ts[2m > [22m[2mDivisions Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/routes/divisions.test.ts[2m > [22m[2mDivisions Routes Integration Tests[2m > [22m[2mPOST /api/divisions[2m > [22m[2mshould return 409 when division code already exists
[22m[39mprisma:error 
Invalid `this.prisma.division.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:66:49

  63  * Create a new division
  64  */
  65 async create(data: CreateDivisionInput): Promise<Division> {
→ 66   const division = await this.prisma.division.create(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/routes/divisions.test.ts[2m > [22m[2mDivisions Routes Integration Tests[2m > [22m[2mPATCH /api/divisions/:id[2m > [22m[2mshould return 404 when division does not exist
[22m[39mprisma:error 
Invalid `this.prisma.division.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:86:51

  83 }
  84 
  85 try {
→ 86   const division = await this.prisma.division.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/routes/divisions.test.ts[2m > [22m[2mDivisions Routes Integration Tests[2m > [22m[2mPATCH /api/divisions/:id[2m > [22m[2mshould return 409 when updating to existing code
[22m[39mprisma:error 
Invalid `this.prisma.division.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:86:51

  83 }
  84 
  85 try {
→ 86   const division = await this.prisma.division.update(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/routes/divisions.test.ts[2m > [22m[2mDivisions Routes Integration Tests[2m > [22m[2mDELETE /api/divisions/:id[2m > [22m[2mshould return 404 when division does not exist
[22m[39mprisma:error 
Invalid `this.prisma.division.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:130:34

  127 }
  128 
  129 try {
→ 130   await this.prisma.division.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [31m❯[39m tests/integration/routes/divisions.test.ts [2m([22m[2m19 tests[22m[2m | [22m[31m6 failed[39m[2m)[22m[33m 63095[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no divisions exist [33m 4146[2mms[22m[39m
[31m       [31m×[31m should return 200 with divisions list[39m[33m 2996[2mms[22m[39m
[31m       [31m×[31m should include member counts for each division[39m[33m 2500[2mms[22m[39m
[31m       [31m×[31m should return 200 with division data when division exists[39m[33m 2566[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when division does not exist [33m 2727[2mms[22m[39m
[31m       [31m×[31m should include accurate member count[39m[33m 2726[2mms[22m[39m
[31m       [31m×[31m should return 201 and create division with valid data[39m[33m 2525[2mms[22m[39m
       [33m[2m✓[22m[39m should create division without description (optional field) [33m 2620[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when division code already exists [33m 2571[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for missing required fields [33m 2805[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for invalid code length [33m 2872[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and update division with valid data [33m 2694[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when division does not exist [33m 2611[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when updating to existing code [33m 2716[2mms[22m[39m
       [33m[2m✓[22m[39m should allow partial updates [33m 2881[2mms[22m[39m
[31m       [31m×[31m should preserve member count in response[39m[33m 2852[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and delete division when empty [33m 2605[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when division does not exist [33m 2859[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when division has members [33m 2798[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/health.test.ts[2m > [22m[2mHealth Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/health.test.ts[2m > [22m[2mHealth Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

 [31m❯[39m tests/integration/routes/health.test.ts [2m([22m[2m8 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 10177[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with healthy status and database check [33m 394[2mms[22m[39m
       [32m✓[39m should include uptime and timestamp[32m 15[2mms[22m[39m
       [32m✓[39m should return 200 when database is accessible[32m 10[2mms[22m[39m
       [32m✓[39m should have timestamp in ISO format[32m 8[2mms[22m[39m
       [32m✓[39m should always return 200[32m 5[2mms[22m[39m
       [32m✓[39m should have positive uptime[32m 4[2mms[22m[39m
[31m       [31m×[31m should return 200 with performance metrics[39m[32m 16[2mms[22m[39m
[31m       [31m×[31m should have memory metrics[39m[32m 9[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate service number
[22m[39mprisma:error 
Invalid `this.prisma.member.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:462:45

  459  * Create a new member
  460  */
  461 async create(data: CreateMemberInput): Promise<Member> {
→ 462   const member = await this.prisma.member.create(
Unique constraint failed on the fields: (`service_number`)

[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error when division does not exist
[22m[39mprisma:error 
Invalid `this.prisma.member.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:462:45

  459  * Create a new member
  460  */
  461 async create(data: CreateMemberInput): Promise<Member> {
→ 462   const member = await this.prisma.member.create(
Foreign key constraint violated on the constraint: `members_division_id_fkey`

[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when member does not exist
[22m[39mprisma:error 
Invalid `tx.member.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:555:41

  552 // Update member fields if any
  553 let updatedMember
  554 if (hasFieldUpdate) {
→ 555   updatedMember = await tx.member.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when updating to duplicate service number
[22m[39mprisma:error 
Invalid `tx.member.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:555:41

  552 // Update member fields if any
  553 let updatedMember
  554 if (hasFieldUpdate) {
→ 555   updatedMember = await tx.member.update(
Unique constraint failed on the fields: (`service_number`)

[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mbulkCreate[2m > [22m[2mshould rollback entire transaction on error
[22m[39mprisma:error 
Invalid `tx.member.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:715:25

  712 let insertedCount = 0
  713 
  714 for (const memberData of members) {
→ 715   await tx.member.create(
Unique constraint failed on the fields: (`service_number`)

[90mstdout[2m | tests/integration/repositories/member-repository.test.ts[2m > [22m[2mMemberRepository Integration Tests[2m > [22m[2mbulkUpdate[2m > [22m[2mshould rollback on error
[22m[39mprisma:error 
Invalid `tx.member.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:815:25

  812   continue // Skip if no fields to update
  813 }
  814 
→ 815 await tx.member.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

 [32m✓[39m tests/integration/repositories/member-repository.test.ts [2m([22m[2m65 tests[22m[2m)[22m[33m 215570[2mms[22m[39m
       [33m[2m✓[22m[39m should create a member with all required fields [33m 2780[2mms[22m[39m
       [33m[2m✓[22m[39m should create a member with all optional fields [33m 2510[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate service number [33m 2613[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when division does not exist [33m 3219[2mms[22m[39m
       [33m[2m✓[22m[39m should find member by ID with division and badge [33m 2805[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when member does not exist [33m 2745[2mms[22m[39m
       [33m[2m✓[22m[39m should find member by service number [33m 2933[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when service number does not exist [33m 3019[2mms[22m[39m
       [33m[2m✓[22m[39m should update member basic fields [33m 2866[2mms[22m[39m
       [33m[2m✓[22m[39m should update member status [33m 2603[2mms[22m[39m
       [33m[2m✓[22m[39m should update member division [33m 2743[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when member does not exist [33m 2810[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating to duplicate service number [33m 3132[2mms[22m[39m
       [33m[2m✓[22m[39m should soft delete a member [33m 2590[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when member does not exist [33m 3982[2mms[22m[39m
       [33m[2m✓[22m[39m should find all members without filters [33m 2741[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by division [33m 2588[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by member type [33m 2954[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by status [33m 3450[2mms[22m[39m
       [33m[2m✓[22m[39m should search by name [33m 4432[2mms[22m[39m
       [33m[2m✓[22m[39m should search by service number [33m 4507[2mms[22m[39m
       [33m[2m✓[22m[39m should combine multiple filters [33m 3723[2mms[22m[39m
       [33m[2m✓[22m[39m should paginate results with default page size [33m 3233[2mms[22m[39m
       [33m[2m✓[22m[39m should return second page of results [33m 3590[2mms[22m[39m
       [33m[2m✓[22m[39m should sort by field ascending [33m 3242[2mms[22m[39m
       [33m[2m✓[22m[39m should sort by field descending [33m 4056[2mms[22m[39m
       [33m[2m✓[22m[39m should combine pagination with filters [33m 3729[2mms[22m[39m
       [33m[2m✓[22m[39m should find multiple members by IDs [33m 2715[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no IDs provided [33m 3139[2mms[22m[39m
       [33m[2m✓[22m[39m should skip non-existent IDs [33m 3089[2mms[22m[39m
       [33m[2m✓[22m[39m should find multiple members by service numbers [33m 2616[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no service numbers provided [33m 3518[2mms[22m[39m
       [33m[2m✓[22m[39m should create multiple members in one transaction [33m 4153[2mms[22m[39m
       [33m[2m✓[22m[39m should rollback entire transaction on error [33m 2795[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple members in one transaction [33m 3724[2mms[22m[39m
       [33m[2m✓[22m[39m should rollback on error [33m 3478[2mms[22m[39m
       [33m[2m✓[22m[39m should add tag to member [33m 2998[2mms[22m[39m
       [33m[2m✓[22m[39m should add multiple tags to member [33m 2807[2mms[22m[39m
       [33m[2m✓[22m[39m should not duplicate tags [33m 3432[2mms[22m[39m
       [33m[2m✓[22m[39m should remove tag from member [33m 3734[2mms[22m[39m
       [33m[2m✓[22m[39m should filter members by tags [33m 2625[2mms[22m[39m
       [33m[2m✓[22m[39m should exclude members by tags [33m 3235[2mms[22m[39m
       [33m[2m✓[22m[39m should flag member for review [33m 3252[2mms[22m[39m
       [33m[2m✓[22m[39m should clear badge reference from member [33m 3259[2mms[22m[39m
       [33m[2m✓[22m[39m should return absent when no checkins exist [33m 2462[2mms[22m[39m
       [33m[2m✓[22m[39m should return present when last checkin is IN [33m 3742[2mms[22m[39m
       [33m[2m✓[22m[39m should return absent when last checkin is OUT [33m 2641[2mms[22m[39m
       [33m[2m✓[22m[39m should return absent for member with no badge [33m 2971[2mms[22m[39m
         [33m[2m✓[22m[39m should handle removing non-existent tag gracefully [33m 2542[2mms[22m[39m
         [33m[2m✓[22m[39m should handle adding tag to multiple members [33m 3231[2mms[22m[39m
         [33m[2m✓[22m[39m should handle empty search string [33m 3152[2mms[22m[39m
         [33m[2m✓[22m[39m should return empty array when no members match combined filters [33m 3973[2mms[22m[39m
         [33m[2m✓[22m[39m should handle null badge in filters [33m 2539[2mms[22m[39m
         [33m[2m✓[22m[39m should return empty array for page beyond total pages [33m 2604[2mms[22m[39m
         [33m[2m✓[22m[39m should handle limit of 1 [33m 3320[2mms[22m[39m
         [33m[2m✓[22m[39m should reject very large limit [33m 3138[2mms[22m[39m
         [33m[2m✓[22m[39m should handle empty array in bulkCreate [33m 3020[2mms[22m[39m
         [33m[2m✓[22m[39m should handle single item in bulkUpdate [33m 3146[2mms[22m[39m
         [33m[2m✓[22m[39m should handle bulkUpdate with no updates needed [33m 2614[2mms[22m[39m
         [33m[2m✓[22m[39m should handle duplicate service numbers in input [33m 2920[2mms[22m[39m
         [33m[2m✓[22m[39m should handle mix of existing and non-existing service numbers [33m 3237[2mms[22m[39m
         [33m[2m✓[22m[39m should handle flagging multiple members [33m 3573[2mms[22m[39m
         [33m[2m✓[22m[39m should handle empty array in flagForReview [33m 3227[2mms[22m[39m
         [33m[2m✓[22m[39m should handle clearing badge for multiple members [33m 3075[2mms[22m[39m
         [33m[2m✓[22m[39m should handle clearing badge that has no members [33m 3167[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/division-repository.test.ts[2m > [22m[2mDivisionRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/division-repository.test.ts[2m > [22m[2mDivisionRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/division-repository.test.ts[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `this.prisma.division.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:66:49

  63  * Create a new division
  64  */
  65 async create(data: CreateDivisionInput): Promise<Division> {
→ 66   const division = await this.prisma.division.create(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/repositories/division-repository.test.ts[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `this.prisma.division.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:44:49

  41  * Find division by ID
  42  */
  43 async findById(id: string): Promise<Division | null> {
→ 44   const division = await this.prisma.division.findUnique(
Invalid input value: invalid input syntax for type uuid: "invalid-id"

[90mstdout[2m | tests/integration/repositories/division-repository.test.ts[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when updating non-existent division
[22m[39mprisma:error 
Invalid `this.prisma.division.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:86:51

  83 }
  84 
  85 try {
→ 86   const division = await this.prisma.division.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/division-repository.test.ts[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `this.prisma.division.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:86:51

  83 }
  84 
  85 try {
→ 86   const division = await this.prisma.division.update(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/repositories/division-repository.test.ts[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when deleting non-existent division
[22m[39mprisma:error 
Invalid `this.prisma.division.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:130:34

  127 }
  128 
  129 try {
→ 130   await this.prisma.division.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [32m✓[39m tests/integration/repositories/division-repository.test.ts [2m([22m[2m31 tests[22m[2m)[22m[33m 99172[2mms[22m[39m
       [33m[2m✓[22m[39m should create a division with all required fields [33m 3795[2mms[22m[39m
       [33m[2m✓[22m[39m should create a division without description [33m 2952[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2759[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no divisions exist [33m 2269[2mms[22m[39m
       [33m[2m✓[22m[39m should return all divisions sorted by code [33m 2146[2mms[22m[39m
       [33m[2m✓[22m[39m should return divisions with correct field types [33m 3310[2mms[22m[39m
       [33m[2m✓[22m[39m should find an existing division by ID [33m 2140[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when division does not exist [33m 2192[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 2841[2mms[22m[39m
       [33m[2m✓[22m[39m should find an existing division by code [33m 2274[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when division code does not exist [33m 2856[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 3018[2mms[22m[39m
       [33m[2m✓[22m[39m should update division name [33m 2576[2mms[22m[39m
       [33m[2m✓[22m[39m should update division code [33m 3992[2mms[22m[39m
       [33m[2m✓[22m[39m should update division description [33m 3182[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields at once [33m 2596[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent division [33m 3185[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 3086[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2539[2mms[22m[39m
       [33m[2m✓[22m[39m should delete a division with no members [33m 3256[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent division [33m 3455[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting division with assigned members [33m 2525[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting division with multiple assigned members [33m 2949[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for division with no members [33m 3409[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for division with members [33m 3232[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent division [33m 2594[2mms[22m[39m
       [33m[2m✓[22m[39m should count members across different statuses [33m 3058[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long division names [33m 2591[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in division names [33m 3178[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long descriptions [33m 2680[2mms[22m[39m
       [33m[2m✓[22m[39m should handle null to undefined conversion for description [33m 3198[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/events.test.ts[2m > [22m[2mEvents Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/events.test.ts[2m > [22m[2mEvents Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/routes/events.test.ts[2m > [22m[2mEvents Routes Integration Tests[2m > [22m[2mPOST /api/events[2m > [22m[2mshould return 409 when event code already exists
[22m[39mprisma:error 
Invalid `this.prisma.event.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:145:43

  142   data.createdBy &&
  143   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.createdBy)
  144 
→ 145 const event = await this.prisma.event.create(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/routes/events.test.ts[2m > [22m[2mEvents Routes Integration Tests[2m > [22m[2mPATCH /api/events/:id[2m > [22m[2mshould return 404 when event does not exist
[22m[39mprisma:error 
Invalid `this.prisma.event.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:201:45

  198 updateData.updatedAt = new Date()
  199 
  200 try {
→ 201   const event = await this.prisma.event.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/routes/events.test.ts[2m > [22m[2mEvents Routes Integration Tests[2m > [22m[2mDELETE /api/events/:id[2m > [22m[2mshould return 404 when event does not exist
[22m[39mprisma:error 
Invalid `this.prisma.event.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:220:31

  217  */
  218 async delete(id: string): Promise<void> {
  219   try {
→ 220     await this.prisma.event.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

[90mstdout[2m | tests/integration/routes/events.test.ts[2m > [22m[2mEvents Routes Integration Tests[2m > [22m[2mPATCH /api/events/:id/attendees/:attendeeId[2m > [22m[2mshould return 404 when attendee does not exist
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:329:56

  326 updateData.updatedAt = new Date()
  327 
  328 try {
→ 329   const attendee = await this.prisma.eventAttendee.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/routes/events.test.ts[2m > [22m[2mEvents Routes Integration Tests[2m > [22m[2mDELETE /api/events/:id/attendees/:attendeeId[2m > [22m[2mshould return 404 when attendee does not exist
[22m[39mprisma:error 
Invalid `this.prisma.eventAttendee.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/event-repository.ts:348:39

  345  */
  346 async removeAttendee(id: string): Promise<void> {
  347   try {
→ 348     await this.prisma.eventAttendee.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [32m✓[39m tests/integration/routes/events.test.ts [2m([22m[2m29 tests[22m[2m)[22m[33m 100864[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no events exist [33m 3191[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with events list [33m 3001[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and create event with valid data [33m 2618[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when event code already exists [33m 3174[2mms[22m[39m
       [33m[2m✓[22m[39m should return 500 when end date is before start date [33m 2579[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with event data when event exists [33m 2585[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when event does not exist [33m 2661[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for invalid UUID format [33m 3167[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and update event with valid data [33m 2612[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when event does not exist [33m 3246[2mms[22m[39m
       [33m[2m✓[22m[39m should allow partial updates [33m 2674[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and delete event [33m 3848[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when event does not exist [33m 3230[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and close event [33m 3326[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when event does not exist [33m 2924[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with event statistics [33m 2796[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when event does not exist [33m 2960[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no attendees [33m 3856[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with attendees list [33m 3356[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and add attendee with valid data [33m 2530[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and update attendee [33m 3303[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when attendee does not exist [33m 3454[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and remove attendee [33m 3125[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when attendee does not exist [33m 3271[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and assign badge to attendee [33m 2618[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when attendee does not exist [33m 2994[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and unassign badge from attendee [33m 2693[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when attendee does not exist [33m 3195[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with available badges [33m 3208[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/list-item-repository.test.ts[2m > [22m[2mListItemRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/list-item-repository.test.ts[2m > [22m[2mListItemRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/list-item-repository.test.ts[2m > [22m[2mListItemRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

 [32m✓[39m tests/integration/repositories/list-item-repository.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 115251[2mms[22m[39m
       [33m[2m✓[22m[39m should create a list item with all fields [33m 4227[2mms[22m[39m
       [33m[2m✓[22m[39m should create list item without optional fields [33m 3192[2mms[22m[39m
       [33m[2m✓[22m[39m should auto-increment display order [33m 2557[2mms[22m[39m
       [33m[2m✓[22m[39m should respect custom display order [33m 3238[2mms[22m[39m
       [33m[2m✓[22m[39m should allow same code in different list types [33m 2610[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no items exist [33m 3160[2mms[22m[39m
       [33m[2m✓[22m[39m should return only items of specified type [33m 3114[2mms[22m[39m
       [33m[2m✓[22m[39m should return items ordered by displayOrder then name [33m 2659[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing list item by ID [33m 3235[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when item does not exist [33m 2487[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 2606[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing list item by type and code [33m 3118[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist in type [33m 2992[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code exists in different type [33m 2636[2mms[22m[39m
       [33m[2m✓[22m[39m should update item code [33m 2639[2mms[22m[39m
       [33m[2m✓[22m[39m should update item name [33m 3228[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 3181[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 2632[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent item [33m 3098[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 3096[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing list item [33m 2670[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent item [33m 3537[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for item with no usage [33m 3047[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for rank items [33m 3123[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for mess items [33m 2535[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for event_role items [33m 3149[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent item [33m 3168[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for unknown list type [33m 2612[2mms[22m[39m
       [33m[2m✓[22m[39m should reorder items based on array position [33m 3134[2mms[22m[39m
       [33m[2m✓[22m[39m should handle empty array [33m 2544[2mms[22m[39m
       [33m[2m✓[22m[39m should only reorder items of specified type [33m 3254[2mms[22m[39m
       [33m[2m✓[22m[39m should update updatedAt timestamp [33m 2695[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long item names [33m 2948[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 3135[2mms[22m[39m
       [33m[2m✓[22m[39m should handle large display order values [33m 2591[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/list-item-repository.test.js[2m > [22m[2mListItemRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/list-item-repository.test.js[2m > [22m[2mListItemRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/list-item-repository.test.js[2m > [22m[2mListItemRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

 [32m✓[39m tests/integration/repositories/list-item-repository.test.js [2m([22m[2m35 tests[22m[2m)[22m[33m 116059[2mms[22m[39m
       [33m[2m✓[22m[39m should create a list item with all fields [33m 3367[2mms[22m[39m
       [33m[2m✓[22m[39m should create list item without optional fields [33m 2525[2mms[22m[39m
       [33m[2m✓[22m[39m should auto-increment display order [33m 3235[2mms[22m[39m
       [33m[2m✓[22m[39m should respect custom display order [33m 2531[2mms[22m[39m
       [33m[2m✓[22m[39m should allow same code in different list types [33m 3139[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no items exist [33m 3111[2mms[22m[39m
       [33m[2m✓[22m[39m should return only items of specified type [33m 2845[2mms[22m[39m
       [33m[2m✓[22m[39m should return items ordered by displayOrder then name [33m 3188[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing list item by ID [33m 3123[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when item does not exist [33m 2632[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 3308[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing list item by type and code [33m 3228[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist in type [33m 2665[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code exists in different type [33m 3331[2mms[22m[39m
       [33m[2m✓[22m[39m should update item code [33m 3839[2mms[22m[39m
       [33m[2m✓[22m[39m should update item name [33m 3818[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 3232[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 2724[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent item [33m 3260[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 3127[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing list item [33m 2621[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent item [33m 3161[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for item with no usage [33m 2623[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for rank items [33m 2554[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for mess items [33m 3195[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for event_role items [33m 2603[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent item [33m 3174[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for unknown list type [33m 2525[2mms[22m[39m
       [33m[2m✓[22m[39m should reorder items based on array position [33m 3347[2mms[22m[39m
       [33m[2m✓[22m[39m should handle empty array [33m 2527[2mms[22m[39m
       [33m[2m✓[22m[39m should only reorder items of specified type [33m 3175[2mms[22m[39m
       [33m[2m✓[22m[39m should update updatedAt timestamp [33m 3255[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long item names [33m 3126[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 2374[2mms[22m[39m
       [33m[2m✓[22m[39m should handle large display order values [33m 3451[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/tag-repository.test.js[2m > [22m[2mTagRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/tag-repository.test.js[2m > [22m[2mTagRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/tag-repository.test.js[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate name
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "tags_name_key"`

[90mstdout[2m | tests/integration/repositories/tag-repository.test.js[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/tag-repository.test.js[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate name
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "tags_name_key"`

[90mstdout[2m | tests/integration/repositories/tag-repository.test.js[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when deleting non-existent tag
[22m[39mprisma:error 
Invalid `this.prisma.tag.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/tag-repository.ts:149:29

  146  */
  147 async delete(id: string): Promise<void> {
  148   try {
→ 149     await this.prisma.tag.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [32m✓[39m tests/integration/repositories/tag-repository.test.js [2m([22m[2m32 tests[22m[2m)[22m[33m 106107[2mms[22m[39m
       [33m[2m✓[22m[39m should create a tag with all fields [33m 4017[2mms[22m[39m
       [33m[2m✓[22m[39m should create tag without description [33m 3176[2mms[22m[39m
       [33m[2m✓[22m[39m should auto-increment display order [33m 2705[2mms[22m[39m
       [33m[2m✓[22m[39m should respect custom display order [33m 3159[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate name [33m 2982[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no tags exist [33m 2923[2mms[22m[39m
       [33m[2m✓[22m[39m should return all tags ordered by displayOrder then name [33m 3423[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing tag by ID [33m 2942[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when tag does not exist [33m 2590[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 3271[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing tag by name [33m 3284[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when tag name does not exist [33m 2631[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 3364[2mms[22m[39m
       [33m[2m✓[22m[39m should update tag name [33m 3287[2mms[22m[39m
       [33m[2m✓[22m[39m should update tag color [33m 2558[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 3066[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 2995[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent tag [33m 3739[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 5345[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate name [33m 3302[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing tag [33m 2714[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent tag [33m 2816[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for tag with no members [33m 2549[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for tag with members [33m 2523[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent tag [33m 2580[2mms[22m[39m
       [33m[2m✓[22m[39m should reorder tags based on array position [33m 2636[2mms[22m[39m
       [33m[2m✓[22m[39m should handle empty array [33m 2485[2mms[22m[39m
       [33m[2m✓[22m[39m should update updatedAt timestamp [33m 2614[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long tag names [33m 2579[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in tag names [33m 2553[2mms[22m[39m
       [33m[2m✓[22m[39m should handle hex color formats [33m 2600[2mms[22m[39m
       [33m[2m✓[22m[39m should handle large display order values [33m 2527[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/division-repository.test.js[2m > [22m[2mDivisionRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/division-repository.test.js[2m > [22m[2mDivisionRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/division-repository.test.js[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `this.prisma.division.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:66:49

  63  * Create a new division
  64  */
  65 async create(data: CreateDivisionInput): Promise<Division> {
→ 66   const division = await this.prisma.division.create(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/repositories/division-repository.test.js[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `this.prisma.division.findUnique()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:44:49

  41  * Find division by ID
  42  */
  43 async findById(id: string): Promise<Division | null> {
→ 44   const division = await this.prisma.division.findUnique(
Invalid input value: invalid input syntax for type uuid: "invalid-id"

[90mstdout[2m | tests/integration/repositories/division-repository.test.js[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error when updating non-existent division
[22m[39mprisma:error 
Invalid `this.prisma.division.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:86:51

  83 }
  84 
  85 try {
→ 86   const division = await this.prisma.division.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/repositories/division-repository.test.js[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `this.prisma.division.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:86:51

  83 }
  84 
  85 try {
→ 86   const division = await this.prisma.division.update(
Unique constraint failed on the fields: (`code`)

[90mstdout[2m | tests/integration/repositories/division-repository.test.js[2m > [22m[2mDivisionRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when deleting non-existent division
[22m[39mprisma:error 
Invalid `this.prisma.division.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/division-repository.ts:130:34

  127 }
  128 
  129 try {
→ 130   await this.prisma.division.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [32m✓[39m tests/integration/repositories/division-repository.test.js [2m([22m[2m31 tests[22m[2m)[22m[33m 85779[2mms[22m[39m
       [33m[2m✓[22m[39m should create a division with all required fields [33m 2565[2mms[22m[39m
       [33m[2m✓[22m[39m should create a division without description [33m 2801[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2182[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no divisions exist [33m 2028[2mms[22m[39m
       [33m[2m✓[22m[39m should return all divisions sorted by code [33m 2289[2mms[22m[39m
       [33m[2m✓[22m[39m should return divisions with correct field types [33m 2627[2mms[22m[39m
       [33m[2m✓[22m[39m should find an existing division by ID [33m 2355[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when division does not exist [33m 1992[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 2568[2mms[22m[39m
       [33m[2m✓[22m[39m should find an existing division by code [33m 2496[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when division code does not exist [33m 2097[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 2074[2mms[22m[39m
       [33m[2m✓[22m[39m should update division name [33m 2944[2mms[22m[39m
       [33m[2m✓[22m[39m should update division code [33m 3051[2mms[22m[39m
       [33m[2m✓[22m[39m should update division description [33m 2904[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields at once [33m 2534[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent division [33m 2553[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 2380[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2547[2mms[22m[39m
       [33m[2m✓[22m[39m should delete a division with no members [33m 2468[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent division [33m 2671[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting division with assigned members [33m 2634[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting division with multiple assigned members [33m 2632[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for division with no members [33m 2628[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for division with members [33m 2567[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent division [33m 2614[2mms[22m[39m
       [33m[2m✓[22m[39m should count members across different statuses [33m 2609[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long division names [33m 2622[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in division names [33m 2680[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long descriptions [33m 2748[2mms[22m[39m
       [33m[2m✓[22m[39m should handle null to undefined conversion for description [33m 2735[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/tag-repository.test.ts[2m > [22m[2mTagRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/tag-repository.test.ts[2m > [22m[2mTagRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/tag-repository.test.ts[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate name
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "tags_name_key"`

[90mstdout[2m | tests/integration/repositories/tag-repository.test.ts[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/tag-repository.test.ts[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate name
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "tags_name_key"`

[90mstdout[2m | tests/integration/repositories/tag-repository.test.ts[2m > [22m[2mTagRepository Integration Tests[2m > [22m[2mdelete[2m > [22m[2mshould throw error when deleting non-existent tag
[22m[39mprisma:error 
Invalid `this.prisma.tag.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/tag-repository.ts:149:29

  146  */
  147 async delete(id: string): Promise<void> {
  148   try {
→ 149     await this.prisma.tag.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [32m✓[39m tests/integration/repositories/tag-repository.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 95963[2mms[22m[39m
       [33m[2m✓[22m[39m should create a tag with all fields [33m 3107[2mms[22m[39m
       [33m[2m✓[22m[39m should create tag without description [33m 3087[2mms[22m[39m
       [33m[2m✓[22m[39m should auto-increment display order [33m 2632[2mms[22m[39m
       [33m[2m✓[22m[39m should respect custom display order [33m 2634[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate name [33m 2671[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no tags exist [33m 2673[2mms[22m[39m
       [33m[2m✓[22m[39m should return all tags ordered by displayOrder then name [33m 2569[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing tag by ID [33m 2780[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when tag does not exist [33m 2551[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 2909[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing tag by name [33m 2547[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when tag name does not exist [33m 2688[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 2553[2mms[22m[39m
       [33m[2m✓[22m[39m should update tag name [33m 2731[2mms[22m[39m
       [33m[2m✓[22m[39m should update tag color [33m 2631[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 2541[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 2780[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent tag [33m 3239[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 2872[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate name [33m 3007[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing tag [33m 3347[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent tag [33m 2884[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for tag with no members [33m 2574[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for tag with members [33m 2495[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent tag [33m 2548[2mms[22m[39m
       [33m[2m✓[22m[39m should reorder tags based on array position [33m 2536[2mms[22m[39m
       [33m[2m✓[22m[39m should handle empty array [33m 2451[2mms[22m[39m
       [33m[2m✓[22m[39m should update updatedAt timestamp [33m 2474[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long tag names [33m 2584[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in tag names [33m 2690[2mms[22m[39m
       [33m[2m✓[22m[39m should handle hex color formats [33m 2829[2mms[22m[39m
       [33m[2m✓[22m[39m should handle large display order values [33m 2700[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/badges.test.ts[2m > [22m[2mBadges Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/badges.test.ts[2m > [22m[2mBadges Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/routes/badges.test.ts[2m > [22m[2mBadges Routes Integration Tests[2m > [22m[2mPOST /api/badges[2m > [22m[2mshould return 409 when serial number already exists
[22m[39mprisma:error 
Invalid `this.prisma.badge.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:288:43

  285   throw new Error('Serial number is required')
  286 }
  287 
→ 288 const badge = await this.prisma.badge.create(
Unique constraint failed on the fields: (`serial_number`)

[90mstdout[2m | tests/integration/routes/badges.test.ts[2m > [22m[2mBadges Routes Integration Tests[2m > [22m[2mPOST /api/badges/:id/assign[2m > [22m[2mshould return 404 when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:312:43

  309   throw new Error('Cannot assign badge with type "unassigned"')
  310 }
  311 
→ 312 const badge = await this.prisma.badge.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/routes/badges.test.ts[2m > [22m[2mBadges Routes Integration Tests[2m > [22m[2mPOST /api/badges/:id/unassign[2m > [22m[2mshould return 404 when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:328:43

  325  * Unassign badge
  326  */
  327 async unassign(badgeId: string): Promise<Badge> {
→ 328   const badge = await this.prisma.badge.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/routes/badges.test.ts[2m > [22m[2mBadges Routes Integration Tests[2m > [22m[2mDELETE /api/badges/:id[2m > [22m[2mshould return 404 when badge does not exist
[22m[39mprisma:error 
Invalid `this.prisma.badge.delete()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/badge-repository.ts:359:29

  356  * Delete a badge
  357  */
  358 async delete(badgeId: string): Promise<void> {
→ 359   await this.prisma.badge.delete(
An operation failed because it depends on one or more records that were required but not found. No record was found for a delete.

 [32m✓[39m tests/integration/routes/badges.test.ts [2m([22m[2m26 tests[22m[2m)[22m[33m 80568[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no badges exist [33m 3559[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with paginated badges list [33m 2627[2mms[22m[39m
       [33m[2m✓[22m[39m should support pagination query parameters [33m 2607[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by status [33m 2754[2mms[22m[39m
       [33m[2m✓[22m[39m should filter assigned badges only [33m 2602[2mms[22m[39m
       [33m[2m✓[22m[39m should filter unassigned badges only [33m 2590[2mms[22m[39m
       [33m[2m✓[22m[39m should include assigned member details [33m 2673[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with badge data when badge exists [33m 2699[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when badge does not exist [33m 2617[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with badge data when serial number exists [33m 2561[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when serial number does not exist [33m 2677[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and create badge with valid data [33m 2700[2mms[22m[39m
       [33m[2m✓[22m[39m should create assigned badge [33m 2540[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when serial number already exists [33m 2572[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for missing required fields [33m 2624[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and update badge status [33m 2684[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when badge does not exist [33m 2602[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and assign badge to member [33m 2560[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when badge does not exist [33m 2690[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when assigned member does not exist [33m 2606[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and unassign badge [33m 2633[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when badge does not exist [33m 2617[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and delete badge [33m 2704[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when badge does not exist [33m 2525[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with badge statistics [33m 2619[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct counts when no badges exist [33m 5262[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/member-status-repository.test.js[2m > [22m[2mMemberStatusRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.js[2m > [22m[2mMemberStatusRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.js[2m > [22m[2mMemberStatusRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_statuses_code_key"`

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.js[2m > [22m[2mMemberStatusRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.js[2m > [22m[2mMemberStatusRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_statuses_code_key"`

 [32m✓[39m tests/integration/repositories/member-status-repository.test.js [2m([22m[2m27 tests[22m[2m)[22m[33m 78936[2mms[22m[39m
       [33m[2m✓[22m[39m should create a member status with all fields [33m 3127[2mms[22m[39m
       [33m[2m✓[22m[39m should create member status without optional fields [33m 2804[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2557[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no statuses exist [33m 2593[2mms[22m[39m
       [33m[2m✓[22m[39m should return all statuses ordered by name [33m 2467[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member status by ID [33m 2551[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when status does not exist [33m 2512[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 2617[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member status by code [33m 2607[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 2609[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 2534[2mms[22m[39m
       [33m[2m✓[22m[39m should update status code [33m 2576[2mms[22m[39m
       [33m[2m✓[22m[39m should update status name [33m 2630[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 2586[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 2578[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent status [33m 2627[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 2693[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2564[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing member status [33m 2679[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent status [33m 2598[2mms[22m[39m
       [33m[2m✓[22m[39m should prevent deletion when status is in use [33m 2692[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for status with no members [33m 2558[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for status with members [33m 2708[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent status [33m 2552[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long status names [33m 2660[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 2610[2mms[22m[39m
       [33m[2m✓[22m[39m should handle hex color formats [33m 2670[2mms[22m[39m
[90mstdout[2m | tests/integration/repositories/member-status-repository.test.ts[2m > [22m[2mMemberStatusRepository Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.ts[2m > [22m[2mMemberStatusRepository Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.ts[2m > [22m[2mMemberStatusRepository Integration Tests[2m > [22m[2mcreate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_statuses_code_key"`

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.ts[2m > [22m[2mMemberStatusRepository Integration Tests[2m > [22m[2mfindById[2m > [22m[2mshould handle invalid UUID format
[22m[39mprisma:error 
Invalid `prisma.$queryRaw()` invocation:


Raw query failed. Code: `22P02`. Message: `invalid input syntax for type uuid: "invalid-uuid"`

[90mstdout[2m | tests/integration/repositories/member-status-repository.test.ts[2m > [22m[2mMemberStatusRepository Integration Tests[2m > [22m[2mupdate[2m > [22m[2mshould throw error on duplicate code
[22m[39mprisma:error 
Invalid `prisma.$queryRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `duplicate key value violates unique constraint "member_statuses_code_key"`

 [32m✓[39m tests/integration/repositories/member-status-repository.test.ts [2m([22m[2m27 tests[22m[2m)[22m[33m 62709[2mms[22m[39m
       [33m[2m✓[22m[39m should create a member status with all fields [33m 3168[2mms[22m[39m
       [33m[2m✓[22m[39m should create member status without optional fields [33m 2190[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 2159[2mms[22m[39m
       [33m[2m✓[22m[39m should return empty array when no statuses exist [33m 2350[2mms[22m[39m
       [33m[2m✓[22m[39m should return all statuses ordered by name [33m 2143[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member status by ID [33m 2058[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when status does not exist [33m 2081[2mms[22m[39m
       [33m[2m✓[22m[39m should handle invalid UUID format [33m 2048[2mms[22m[39m
       [33m[2m✓[22m[39m should find existing member status by code [33m 2485[2mms[22m[39m
       [33m[2m✓[22m[39m should return null when code does not exist [33m 1557[2mms[22m[39m
       [33m[2m✓[22m[39m should be case-sensitive [33m 1453[2mms[22m[39m
       [33m[2m✓[22m[39m should update status code [33m 1501[2mms[22m[39m
       [33m[2m✓[22m[39m should update status name [33m 1484[2mms[22m[39m
       [33m[2m✓[22m[39m should update multiple fields [33m 2402[2mms[22m[39m
       [33m[2m✓[22m[39m should clear description when set to null [33m 2125[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating non-existent status [33m 2195[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when updating with empty data [33m 1718[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error on duplicate code [33m 1746[2mms[22m[39m
       [33m[2m✓[22m[39m should delete existing member status [33m 1851[2mms[22m[39m
       [33m[2m✓[22m[39m should throw error when deleting non-existent status [33m 2003[2mms[22m[39m
       [33m[2m✓[22m[39m should prevent deletion when status is in use [33m 1914[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for status with no members [33m 1835[2mms[22m[39m
       [33m[2m✓[22m[39m should return correct count for status with members [33m 1880[2mms[22m[39m
       [33m[2m✓[22m[39m should return 0 for non-existent status [33m 1818[2mms[22m[39m
       [33m[2m✓[22m[39m should handle very long status names [33m 2028[2mms[22m[39m
       [33m[2m✓[22m[39m should handle special characters in names [33m 2139[2mms[22m[39m
       [33m[2m✓[22m[39m should handle hex color formats [33m 2689[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/members.test.ts[2m > [22m[2mMembers Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/members.test.ts[2m > [22m[2mMembers Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/routes/members.test.ts[2m > [22m[2mMembers Routes Integration Tests[2m > [22m[2mPOST /api/members[2m > [22m[2mshould return 409 when service number already exists
[22m[39mprisma:error 
Invalid `this.prisma.member.create()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:462:45

  459  * Create a new member
  460  */
  461 async create(data: CreateMemberInput): Promise<Member> {
→ 462   const member = await this.prisma.member.create(
Unique constraint failed on the fields: (`service_number`)

[90mstdout[2m | tests/integration/routes/members.test.ts[2m > [22m[2mMembers Routes Integration Tests[2m > [22m[2mPATCH /api/members/:id[2m > [22m[2mshould return 404 when member does not exist
[22m[39mprisma:error 
Invalid `tx.member.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/member-repository.ts:555:41

  552 // Update member fields if any
  553 let updatedMember
  554 if (hasFieldUpdate) {
→ 555   updatedMember = await tx.member.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

 [32m✓[39m tests/integration/routes/members.test.ts [2m([22m[2m18 tests[22m[2m | [22m[33m2 skipped[39m[2m)[22m[33m 43273[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no members exist [33m 2852[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with paginated members list [33m 2306[2mms[22m[39m
       [33m[2m✓[22m[39m should support pagination query parameters [33m 2239[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by divisionId [33m 2119[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with member data when member exists [33m 2076[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when member does not exist [33m 1903[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for invalid UUID format [33m 1824[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and create member with valid data [33m 2104[2mms[22m[39m
       [33m[2m✓[22m[39m should return 409 when service number already exists [33m 2291[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and update member with valid data [33m 2405[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when member does not exist [33m 2106[2mms[22m[39m
       [33m[2m✓[22m[39m should allow partial updates [33m 2143[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and delete member (soft delete) [33m 2104[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when member does not exist [33m 1945[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with member data when service number exists [33m 1923[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when service number does not exist [33m 2159[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/visitors.test.ts[2m > [22m[2mVisitors Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/visitors.test.ts[2m > [22m[2mVisitors Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

[90mstdout[2m | tests/integration/routes/visitors.test.ts[2m > [22m[2mVisitors Routes Integration Tests[2m > [22m[2mPATCH /api/visitors/:id[2m > [22m[2mshould return 404 when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:162:47

  159  * Update visitor details (event, host, purpose)
  160  */
  161 async update(id: string, data: UpdateVisitorInput): Promise<Visitor> {
→ 162   const visitor = await this.prisma.visitor.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

[90mstdout[2m | tests/integration/routes/visitors.test.ts[2m > [22m[2mVisitors Routes Integration Tests[2m > [22m[2mPOST /api/visitors/:id/checkout[2m > [22m[2mshould return 404 when visitor does not exist
[22m[39mprisma:error 
Invalid `this.prisma.visitor.update()` invocation in
/home/sauk/projects/sentinel/apps/backend/src/repositories/visitor-repository.ts:193:47

  190  * Checkout a visitor (set checkout time to now)
  191  */
  192 async checkout(id: string): Promise<Visitor> {
→ 193   const visitor = await this.prisma.visitor.update(
An operation failed because it depends on one or more records that were required but not found. No record was found for an update.

 [32m✓[39m tests/integration/routes/visitors.test.ts [2m([22m[2m17 tests[22m[2m)[22m[33m 41547[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no active visitors [33m 2287[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with active visitors list [33m 1945[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no visitors exist [33m 1799[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with paginated visitors list [33m 2025[2mms[22m[39m
       [33m[2m✓[22m[39m should support pagination query parameters [33m 2082[2mms[22m[39m
       [33m[2m✓[22m[39m should filter by visitType [33m 2037[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and create visitor with valid data [33m 1776[2mms[22m[39m
       [33m[2m✓[22m[39m should create visitor with minimal required fields [33m 1900[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with visitor data when visitor exists [33m 2103[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when visitor does not exist [33m 2099[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for invalid UUID format [33m 2419[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and update visitor with valid data [33m 2035[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when visitor does not exist [33m 1798[2mms[22m[39m
       [33m[2m✓[22m[39m should allow partial updates [33m 1841[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and checkout visitor [33m 1758[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when visitor does not exist [33m 1855[2mms[22m[39m
       [33m[2m✓[22m[39m should handle already checked-out visitor gracefully [33m 1894[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/lockup.test.ts[2m > [22m[2mLockup Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/lockup.test.ts[2m > [22m[2mLockup Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

 [32m✓[39m tests/integration/routes/lockup.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 27397[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty lists when no one is present [33m 1710[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with present members and visitors [33m 1532[2mms[22m[39m
       [33m[2m✓[22m[39m should not include checked-out members [33m 1790[2mms[22m[39m
       [33m[2m✓[22m[39m should not include checked-out visitors [33m 1796[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with authorized: true when member has Lockup tag [33m 1604[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with authorized: false when member does not have Lockup tag [33m 1570[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when member does not exist [33m 1510[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for invalid UUID format [33m 1459[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and check out all present people [33m 1482[2mms[22m[39m
       [33m[2m✓[22m[39m should execute lockup without note [33m 1514[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 when member is not authorized [33m 1469[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when member does not exist [33m 1475[2mms[22m[39m
       [33m[2m✓[22m[39m should handle lockup when no one is present [33m 1738[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/security-alerts.test.ts[2m > [22m[2mSecurity Alerts Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/security-alerts.test.ts[2m > [22m[2mSecurity Alerts Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

 [32m✓[39m tests/integration/routes/security-alerts.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 28299[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with empty array when no active alerts [33m 2067[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with active alerts list [33m 1888[2mms[22m[39m
       [33m[2m✓[22m[39m should return 201 and create alert with valid data [33m 1887[2mms[22m[39m
       [33m[2m✓[22m[39m should create alert with null badgeSerial [33m 1809[2mms[22m[39m
       [33m[2m✓[22m[39m should create alert with memberId [33m 1679[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with alert data when alert exists [33m 1692[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when alert does not exist [33m 1737[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 for invalid UUID format [33m 1755[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and acknowledge alert [33m 1753[2mms[22m[39m
       [33m[2m✓[22m[39m should acknowledge alert without note [33m 1726[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when alert does not exist [33m 1737[2mms[22m[39m
       [33m[2m✓[22m[39m should return 400 when alert already acknowledged [33m 1809[2mms[22m[39m
[90mstdout[2m | tests/integration/routes/tags.test.ts[2m > [22m[2mTags Routes Integration Tests
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/routes/tags.test.ts[2m > [22m[2mTags Routes Integration Tests
[22m[39mApplying database schema...
Schema applied successfully

 [32m✓[39m tests/integration/routes/tags.test.ts [2m([22m[2m7 tests[22m[2m)[22m[33m 19876[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with null when no one has lockup tag [33m 2007[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 with holder when someone has lockup tag [33m 1834[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and transfer lockup tag to new member [33m 1897[2mms[22m[39m
       [33m[2m✓[22m[39m should return 200 and be idempotent when target already has tag [33m 1752[2mms[22m[39m
       [33m[2m✓[22m[39m should return 404 when target member does not exist [33m 1774[2mms[22m[39m
       [33m[2m✓[22m[39m should transfer tag without notes [33m 1806[2mms[22m[39m
       [33m[2m✓[22m[39m should handle transfer when no current holder exists [33m 1860[2mms[22m[39m
[90mstdout[2m | tests/integration/testcontainers.test.js[2m > [22m[2mTestcontainers Setup
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/testcontainers.test.js[2m > [22m[2mTestcontainers Setup
[22m[39mApplying database schema...
Schema applied successfully

 [32m✓[39m tests/integration/testcontainers.test.js [2m([22m[2m6 tests[22m[2m)[22m[33m 16976[2mms[22m[39m
     [33m[2m✓[22m[39m should connect to PostgreSQL container [33m 1889[2mms[22m[39m
     [33m[2m✓[22m[39m should run migrations successfully [33m 1780[2mms[22m[39m
     [33m[2m✓[22m[39m should create and retrieve a division [33m 1506[2mms[22m[39m
     [33m[2m✓[22m[39m should create and retrieve a member [33m 1441[2mms[22m[39m
     [33m[2m✓[22m[39m should reset database between tests [33m 2802[2mms[22m[39m
     [33m[2m✓[22m[39m should seed database with default data [33m 1442[2mms[22m[39m
[90mstdout[2m | tests/integration/testcontainers.test.ts[2m > [22m[2mTestcontainers Setup
[22m[39mStarting PostgreSQL test container...

[90mstdout[2m | tests/integration/testcontainers.test.ts[2m > [22m[2mTestcontainers Setup
[22m[39mApplying database schema...
Schema applied successfully

 [32m✓[39m tests/integration/testcontainers.test.ts [2m([22m[2m6 tests[22m[2m)[22m[33m 16842[2mms[22m[39m
     [33m[2m✓[22m[39m should connect to PostgreSQL container [33m 1664[2mms[22m[39m
     [33m[2m✓[22m[39m should run migrations successfully [33m 1559[2mms[22m[39m
     [33m[2m✓[22m[39m should create and retrieve a division [33m 1651[2mms[22m[39m
     [33m[2m✓[22m[39m should create and retrieve a member [33m 1606[2mms[22m[39m
     [33m[2m✓[22m[39m should reset database between tests [33m 2888[2mms[22m[39m
     [33m[2m✓[22m[39m should seed database with default data [33m 1513[2mms[22m[39m

[2m Test Files [22m [1m[31m24 failed[39m[22m[2m | [22m[1m[32m18 passed[39m[22m[90m (42)[39m
[2m      Tests [22m [1m[31m170 failed[39m[22m[2m | [22m[1m[32m981 passed[39m[22m[2m | [22m[33m2 skipped[39m[90m (1153)[39m
[2m   Start at [22m 15:26:28
[2m   Duration [22m 2897.86s[2m (transform 2.36s, setup 451ms, import 20.26s, tests 2862.49s, environment 5ms)[22m

 ELIFECYCLE  Command failed with exit code 1.
