<script setup lang="ts">
/**
 * AppIcon — 统一图标组件
 *
 * 基于 Iconify + @iconify-icons/ep，按需加载 Element Plus 图标。
 * 所有项目统一使用此组件，替代直接 import @element-plus/icons-vue。
 *
 * 用法：
 *   <AppIcon name="home-filled" :size="18" />
 *   <AppIcon name="setting" color="var(--color-primary)" />
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

// 预注册常用 EP 图标
import HomeFilled from '@iconify-icons/ep/home-filled'
import Setting from '@iconify-icons/ep/setting'
import User from '@iconify-icons/ep/user'
import UserFilled from '@iconify-icons/ep/user-filled'
import Lock from '@iconify-icons/ep/lock'
import Key from '@iconify-icons/ep/key'
import Document from '@iconify-icons/ep/document'
import Files from '@iconify-icons/ep/files'
import Grid from '@iconify-icons/ep/grid'
import Odometer from '@iconify-icons/ep/odometer'
import Menu from '@iconify-icons/ep/menu'
import Connection from '@iconify-icons/ep/connection'
import Monitor from '@iconify-icons/ep/monitor'
import Medal from '@iconify-icons/ep/medal'
import Trophy from '@iconify-icons/ep/trophy'
import Platform from '@iconify-icons/ep/platform'
import Cpu from '@iconify-icons/ep/cpu'
import ChatDotRound from '@iconify-icons/ep/chat-dot-round'
import Bell from '@iconify-icons/ep/bell'
import PictureFilled from '@iconify-icons/ep/picture-filled'
import Edit from '@iconify-icons/ep/edit'
import Delete from '@iconify-icons/ep/delete'
import Search from '@iconify-icons/ep/search'
import Plus from '@iconify-icons/ep/plus'
import Refresh from '@iconify-icons/ep/refresh'
import Download from '@iconify-icons/ep/download'
import Upload from '@iconify-icons/ep/upload'
import View from '@iconify-icons/ep/view'
import Check from '@iconify-icons/ep/check'
import Close from '@iconify-icons/ep/close'
import Warning from '@iconify-icons/ep/warning'
import InfoFilled from '@iconify-icons/ep/info-filled'
import SuccessFilled from '@iconify-icons/ep/success-filled'
import ArrowRight from '@iconify-icons/ep/arrow-right'
import ArrowDown from '@iconify-icons/ep/arrow-down'
import ArrowUp from '@iconify-icons/ep/arrow-up'
import ArrowLeft from '@iconify-icons/ep/arrow-left'
import Back from '@iconify-icons/ep/back'
import Right from '@iconify-icons/ep/right'
import Fold from '@iconify-icons/ep/fold'
import Expand from '@iconify-icons/ep/expand'
import Loading from '@iconify-icons/ep/loading'
import MoreFilled from '@iconify-icons/ep/more-filled'
import VideoPlay from '@iconify-icons/ep/video-play'
import VideoPause from '@iconify-icons/ep/video-pause'
import FullScreen from '@iconify-icons/ep/full-screen'
import Position from '@iconify-icons/ep/position'
import Promotion from '@iconify-icons/ep/promotion'
import Clock from '@iconify-icons/ep/clock'
import CircleCheck from '@iconify-icons/ep/circle-check'
import CircleCheckFilled from '@iconify-icons/ep/circle-check-filled'
import CircleCloseFilled from '@iconify-icons/ep/circle-close-filled'
import QuestionFilled from '@iconify-icons/ep/question-filled'
import Rank from '@iconify-icons/ep/rank'
import Sort from '@iconify-icons/ep/sort'
import Timer from '@iconify-icons/ep/timer'
import Message from '@iconify-icons/ep/message'
import SetUp from '@iconify-icons/ep/set-up'
import SwitchButton from '@iconify-icons/ep/switch-button'
import CopyDocument from '@iconify-icons/ep/copy-document'
import Folder from '@iconify-icons/ep/folder'
import FolderAdd from '@iconify-icons/ep/folder-add'
import FolderRemove from '@iconify-icons/ep/folder-remove'
import List from '@iconify-icons/ep/list'
import Notebook from '@iconify-icons/ep/notebook'
import RefreshRight from '@iconify-icons/ep/refresh-right'
import RefreshLeft from '@iconify-icons/ep/refresh-left'
import DocumentCopy from '@iconify-icons/ep/document-copy'
import Calendar from '@iconify-icons/ep/calendar'
import Link from '@iconify-icons/ep/link'
import Share from '@iconify-icons/ep/share'
import Star from '@iconify-icons/ep/star'
import Comment from '@iconify-icons/ep/comment'
import Phone from '@iconify-icons/ep/phone'
import VideoCamera from '@iconify-icons/ep/video-camera'
import House from '@iconify-icons/ep/house'
import MagicStick from '@iconify-icons/ep/magic-stick'
import Operation from '@iconify-icons/ep/operation'
import DataLine from '@iconify-icons/ep/data-line'
import PieChart from '@iconify-icons/ep/pie-chart'
import DataBoard from '@iconify-icons/ep/data-board'
import TrendCharts from '@iconify-icons/ep/trend-charts'
import Histogram from '@iconify-icons/ep/histogram'
import Crop from '@iconify-icons/ep/crop'

/** 图标名称 → Iconify 图标对象映射 */
const ICON_MAP: Record<string, typeof HomeFilled> = {
  'home-filled': HomeFilled,
  setting: Setting,
  user: User,
  'user-filled': UserFilled,
  lock: Lock,
  key: Key,
  document: Document,
  files: Files,
  grid: Grid,
  odometer: Odometer,
  menu: Menu,
  connection: Connection,
  monitor: Monitor,
  medal: Medal,
  trophy: Trophy,
  platform: Platform,
  cpu: Cpu,
  'chat-dot-round': ChatDotRound,
  bell: Bell,
  'picture-filled': PictureFilled,
  edit: Edit,
  delete: Delete,
  search: Search,
  plus: Plus,
  refresh: Refresh,
  download: Download,
  upload: Upload,
  view: View,
  check: Check,
  close: Close,
  warning: Warning,
  'info-filled': InfoFilled,
  'success-filled': SuccessFilled,
  'arrow-right': ArrowRight,
  'arrow-down': ArrowDown,
  'arrow-up': ArrowUp,
  'arrow-left': ArrowLeft,
  back: Back,
  right: Right,
  fold: Fold,
  expand: Expand,
  loading: Loading,
  'more-filled': MoreFilled,
  'video-play': VideoPlay,
  'video-pause': VideoPause,
  'full-screen': FullScreen,
  position: Position,
  promotion: Promotion,
  clock: Clock,
  'circle-check': CircleCheck,
  'circle-check-filled': CircleCheckFilled,
  'circle-close-filled': CircleCloseFilled,
  'question-filled': QuestionFilled,
  rank: Rank,
  sort: Sort,
  timer: Timer,
  message: Message,
  'set-up': SetUp,
  'switch-button': SwitchButton,
  'copy-document': CopyDocument,
  folder: Folder,
  'folder-add': FolderAdd,
  'folder-remove': FolderRemove,
  list: List,
  notebook: Notebook,
  'refresh-right': RefreshRight,
  'refresh-left': RefreshLeft,
  'document-copy': DocumentCopy,
  calendar: Calendar,
  link: Link,
  share: Share,
  star: Star,
  comment: Comment,
  phone: Phone,
  'video-camera': VideoCamera,
  house: House,
  'magic-stick': MagicStick,
  operation: Operation,
  'data-line': DataLine,
  'pie-chart': PieChart,
  'data-board': DataBoard,
  'trend-charts': TrendCharts,
  histogram: Histogram,
  crop: Crop,
}

const props = defineProps<{
  /** 图标名称（kebab-case，如 'home-filled'、'setting'） */
  name: string
  /** 图标大小（px） */
  size?: number | string
  /** 图标颜色 */
  color?: string
}>()

const iconComponent = computed(() => ICON_MAP[props.name] ?? null)
const iconSize = computed(() => {
  if (typeof props.size === 'number') return `${props.size}px`
  return props.size ?? '1em'
})
</script>

<template>
  <Icon
    v-if="iconComponent"
    :icon="iconComponent"
    :width="iconSize"
    :height="iconSize"
    :style="color ? { color } : undefined"
  />
  <!-- fallback: 文本 -->
  <span v-else :style="{ fontSize: iconSize, color }">{{ name.charAt(0).toUpperCase() }}</span>
</template>
