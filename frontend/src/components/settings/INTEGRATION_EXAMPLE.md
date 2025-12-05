# Training Year Settings Integration Example

To integrate the Training Year Settings component into the Settings page, follow this example:

## Import the component

```tsx
import TrainingYearSettings from '../components/settings/TrainingYearSettings';
```

## Add the tab

```tsx
<Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
  <Tab key="divisions" title="Divisions" />
  <Tab key="badges" title="Badges" />
  <Tab key="training-years" title="Training Years" />
</Tabs>
```

## Add the content panel

```tsx
<div className="mt-6">
  {tab === 'divisions' && <DivisionsSettings />}
  {tab === 'badges' && <BadgesSettings />}
  {tab === 'training-years' && <TrainingYearSettings />}
</div>
```

## Complete Example

Here's what the updated Settings.tsx would look like:

```tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  Tab,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Spinner,
} from '@heroui/react';
import PageWrapper from '../components/PageWrapper';
import TrainingYearSettings from '../components/settings/TrainingYearSettings';
import { api } from '../lib/api';
import type { Division, Badge, CreateDivisionInput } from '@shared/types';

export default function Settings() {
  const [tab, setTab] = useState('divisions');

  return (
    <PageWrapper title="Settings">
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as string)}>
        <Tab key="divisions" title="Divisions" />
        <Tab key="badges" title="Badges" />
        <Tab key="training-years" title="Training Years" />
      </Tabs>

      <div className="mt-6">
        {tab === 'divisions' && <DivisionsSettings />}
        {tab === 'badges' && <BadgesSettings />}
        {tab === 'training-years' && <TrainingYearSettings />}
      </div>
    </PageWrapper>
  );
}

// ... rest of the file remains unchanged
```
