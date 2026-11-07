import { useState } from 'react'
import {
  AlertDialog,
  Button,
  Dialog,
  Drawer,
  IconButton,
  Menu,
  Skeleton,
  TextField,
  Tooltip,
} from '../../components/ui'
import { Ellipsis, Plus, Smile, Trash2 } from '../../components/ui/icons'
import { ListIconPopover, type IconChoice } from '../../features/lists'
import { Row, Section } from './shared'

export function OverlaysSection() {
  const [dialog, setDialog] = useState(false)
  const [alert, setAlert] = useState(false)
  const [iconOpen, setIconOpen] = useState(false)
  const [icon, setIcon] = useState<IconChoice>({ icon: 'i:camera', icon_color: 'indigo' })
  return (
    <Section id="overlays" title="Menu, Popover, Dialog, AlertDialog, Drawer, Tooltip">
      <Row label="Menu">
        <Menu
          trigger={
            <IconButton aria-label="List actions" variant="secondary">
              <Ellipsis aria-hidden />
            </IconButton>
          }
          items={[
            { label: 'Rename', onSelect: () => {} },
            { label: 'Move…', onSelect: () => {} },
            { label: 'Unavailable', onSelect: () => {}, disabled: true },
            { type: 'separator' },
            { label: 'Delete', onSelect: () => {}, destructive: true, icon: <Trash2 /> },
          ]}
        />
      </Row>
      <Row label="List icon popover">
        <ListIconPopover value={icon} open={iconOpen} onOpenChange={setIconOpen} onChange={setIcon}>
          <IconButton aria-label="Choose icon" variant="secondary">
            <Smile aria-hidden />
          </IconButton>
        </ListIconPopover>
      </Row>
      <Row label="Dialog / AlertDialog / Drawer">
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="New list"
          description="Name your list. You can move it later."
          trigger={<Button variant="secondary">Open dialog</Button>}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialog(false)}>Create</Button>
            </>
          }
        >
          <TextField label="Name" />
        </Dialog>
        <AlertDialog
          open={alert}
          onOpenChange={setAlert}
          trigger={<Button variant="danger">Delete list…</Button>}
          title="Delete this list?"
          description="It moves to Trash with its 12 items."
          confirmLabel="Delete"
          destructive
          onConfirm={() => setAlert(false)}
        />
        <Drawer
          title="History"
          description="Earlier versions of this description."
          trigger={<Button variant="secondary">Open drawer</Button>}
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </Drawer>
        <Drawer
          side="left"
          title="Collections"
          trigger={<Button variant="secondary">Open left drawer</Button>}
        />
      </Row>
      <Row label="Tooltip">
        <Tooltip content="Add an item">
          <IconButton aria-label="Add item" variant="secondary">
            <Plus aria-hidden />
          </IconButton>
        </Tooltip>
      </Row>
    </Section>
  )
}
