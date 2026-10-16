import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  BabyIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CarIcon,
  CircleIcon,
  DogIcon,
  DumbbellIcon,
  GiftIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HouseIcon,
  PiggyBankIcon,
  PlaneIcon,
  PlusIcon,
  PopcornIcon,
  ReceiptIcon,
  RepeatIcon,
  ScaleIcon,
  SendIcon,
  ShirtIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
  SparklesIcon,
  TrendingUpIcon,
  UtensilsIcon,
  WrenchIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

// Ícones que uma categoria pode ter. A chave fica salva no banco.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  house: HouseIcon,
  zap: ZapIcon,
  "shopping-cart": ShoppingCartIcon,
  utensils: UtensilsIcon,
  car: CarIcon,
  "heart-pulse": HeartPulseIcon,
  popcorn: PopcornIcon,
  "shopping-bag": ShoppingBagIcon,
  send: SendIcon,
  briefcase: BriefcaseIcon,
  "arrow-down-left": ArrowDownLeftIcon,
  "trending-up": TrendingUpIcon,
  plus: PlusIcon,
  circle: CircleIcon,
  plane: PlaneIcon,
  "graduation-cap": GraduationCapIcon,
  dog: DogIcon,
  baby: BabyIcon,
  shirt: ShirtIcon,
  smartphone: SmartphoneIcon,
  dumbbell: DumbbellIcon,
  gift: GiftIcon,
  wrench: WrenchIcon,
  "book-open": BookOpenIcon,
  sparkles: SparklesIcon,
  "piggy-bank": PiggyBankIcon,
  receipt: ReceiptIcon,
};

// Cores sugeridas para categorias, contas e listas.
export const CATEGORY_COLORS = [
  "#0078C8",
  "#4C6EF5",
  "#7950F2",
  "#D6336C",
  "#E64980",
  "#E03131",
  "#F76707",
  "#F59F00",
  "#37B24D",
  "#0CA678",
  "#1098AD",
  "#868E96",
];

export function categoryIcon(key: string | null | undefined): LucideIcon {
  return (key && CATEGORY_ICONS[key]) || CircleIcon;
}

// Lançamentos sem categoria de verdade (transferência, ajuste, conta fixa).
export const SPECIAL_ICONS = {
  transferencia: ArrowLeftRightIcon,
  ajuste: ScaleIcon,
  fixa: RepeatIcon,
} as const;

export const NEUTRAL_COLOR = "#868E96";
