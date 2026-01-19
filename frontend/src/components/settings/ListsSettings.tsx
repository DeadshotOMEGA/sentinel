import { Tabs, Tab } from '@heroui/react';
import SimpleListManager from './lists/SimpleListManager';
import EnumListManager from './lists/EnumListManager';
import DivisionsSettings from './DivisionsSettings';
import TagsSettings from './TagsSettings';

export default function ListsSettings() {
  return (
    <div className="flex h-full">
      <Tabs
        aria-label="List settings tabs"
        placement="start"
        defaultSelectedKey="tags"
      >
      <Tab key="tags" title="Tags">
        <TagsSettings />
      </Tab>

      <Tab key="visit-types" title="Visit Reason">
        <EnumListManager
          enumType="visit-types"
          title="Visit Reasons"
          description="Manage types of visitor check-ins"
          showColor
        />
      </Tab>

      <Tab key="event-roles" title="Event Roles">
        <SimpleListManager
          listType="event_role"
          title="Event Roles"
          description="Manage roles that can be assigned to event participants"
        />
      </Tab>

      <Tab key="badge-status" title="Badge Status">
        <EnumListManager
          enumType="badge-statuses"
          title="Badge Statuses"
          description="Manage badge status values (active, disabled, lost, returned)"
          showColor
        />
      </Tab>

      <Tab key="member-status" title="Member Status">
        <EnumListManager
          enumType="member-statuses"
          title="Member Statuses"
          description="Manage member status values (active, inactive, etc.)"
          showColor
        />
      </Tab>

      <Tab key="divisions" title="Divisions">
        <DivisionsSettings />
      </Tab>

      <Tab key="ranks" title="Ranks">
        <SimpleListManager
          listType="rank"
          title="Ranks"
          description="Manage rank values used in the nominal roll"
          allowReorder
        />
      </Tab>

      <Tab key="mess" title="Mess">
        <SimpleListManager
          listType="mess"
          title="Mess"
          description="Manage mess values used in the nominal roll"
          allowReorder
        />
      </Tab>

      <Tab key="moc" title="MOC">
        <SimpleListManager
          listType="moc"
          title="MOC"
          description="Manage MOC (Military Occupational Classification) values"
          allowReorder
        />
      </Tab>
    </Tabs>
    </div>
  );
}
