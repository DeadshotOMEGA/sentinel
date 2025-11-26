export interface ActivityItem {
  id: string;
  type: 'checkin' | 'checkout' | 'visitor';
  name: string;
  rank?: string;
  division?: string;
  timestamp: string;
}
