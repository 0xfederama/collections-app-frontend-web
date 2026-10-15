// The only Lucide import site (D-047): each glyph is imported by name so only used icons ship.
export {
  ArrowDown,
  ArrowUpDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Ellipsis,
  ExternalLink,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  GripVertical,
  ImagePlus,
  Inbox,
  Globe,
  Info,
  LayoutGrid,
  List,
  ListPlus,
  LoaderCircle,
  MessagesSquare,
  Menu as MenuIcon,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Rows3,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Camera, Car, Film, Motorbike, Tag, Tv, type LucideIcon } from 'lucide-react'

export type ItemKind = 'generic' | 'movie' | 'tv_show' | 'motorcycle' | 'car' | 'camera'

export const kindIcons: Record<ItemKind, LucideIcon> = {
  generic: Tag,
  movie: Film,
  tv_show: Tv,
  motorcycle: Motorbike,
  car: Car,
  camera: Camera,
}

export const kindLabels: Record<ItemKind, string> = {
  generic: 'Item',
  movie: 'Movie',
  tv_show: 'TV show',
  motorcycle: 'Motorcycle',
  car: 'Car',
  camera: 'Camera',
}

export type { LucideIcon }
