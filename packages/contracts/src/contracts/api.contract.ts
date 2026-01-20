import { initContract } from '@ts-rest/core'
import { memberContract } from './member.contract.js'
import { checkinContract } from './checkin.contract.js'
import { divisionContract } from './division.contract.js'
import { badgeContract } from './badge.contract.js'
import { auditContract } from './audit.contract.js'

const c = initContract()

/**
 * Main API contract
 *
 * Combines all route contracts into a single API contract
 * for use with ts-rest client and server
 */
export const apiContract = c.router({
  members: memberContract,
  checkins: checkinContract,
  divisions: divisionContract,
  badges: badgeContract,
  auditLogs: auditContract,
}, {
  pathPrefix: '',
})
