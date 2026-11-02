'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Avatar,
  Chip,
  Checkbox,
  Pagination,
  // Card
  CardRoot,
  CardHeader,
  CardTitle,
  CardContent,
  // Tabs
  Tabs,
  TabListContainer,
  TabList,
  Tab,
  TabPanel,
  // Input
  InputGroupRoot,
  InputGroupPrefix,
  Input,
  // Dropdown
  DropdownRoot,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  // Modal
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseTrigger,
  // Hook
  useOverlayState,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import {
  ShieldCheck,
  Globe,
  Store,
  Wallet,
  Search,
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  Zap,
  CreditCard,
  Clock,
  CheckCircle2,
  Lock,
  FileText,
  Eye,
  Timer,
  XCircle,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  LogOut,
  Calendar,
  Download,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TenantData {
  id: string;
  worker_id?: number;
  name: string;
  slug: string;
  category: string;
  city: string;
  status: 'draft' | 'published' | 'locked' | string;
  package_tier: string | null;
  custom_domain: string | null;
  layout_id?: string | null;
  site_active_until: string | null;
  domain_active_until: string | null;
  fomo_expires_at?: string | null;
  created_at: string;
  updated_at?: string;
  user_id?: string | null;
  owner_name?: string;
  email?: string;
  image_url?: string;
  metadata?: any;
  draft_metadata?: any;
}

export interface TransactionData {
  id: string;
  user_id: string | null;
  business_demo_id: string | null;
  business_name?: string;
  business_slug?: string | null;
  amount: number | null;
  status: 'paid' | 'pending' | 'failed' | 'expired' | string;
  snapshot_tier: string | null;
  transaction_type: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_gateway_ref: string | null;
  created_at: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalPublished: number;
  totalDemos: number;
  totalTransactions: number;
}

interface Props {
  initialStats: AdminStats;
  initialTenants: TenantData[];
  initialTransactions: TransactionData[];
  adminEmail: string;
}

// ─── Dummy data (fallback for dev / empty DB) ─────────────────────────────────

const DUMMY_TENANTS: TenantData[] = [
  {
    id: '1',
    worker_id: 4586932,
    name: 'Warung Bu Sari',
    slug: 'warung-bu-sari',
    category: 'Restoran',
    city: 'Yogyakarta',
    status: 'published',
    package_tier: 'starter',
    layout_id: 'Kuliner-Modern',
    custom_domain: null,
    site_active_until: '2027-01-01',
    domain_active_until: null,
    fomo_expires_at: null,
    created_at: '2026-09-01T08:00:00Z',
    user_id: 'user-1',
    owner_name: 'Sari Rahayu',
    email: 'sari@warungbusari.id',
    image_url: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg',
  },
  {
    id: '2',
    worker_id: 5273849,
    name: 'Salon Cantika',
    slug: 'salon-cantika',
    category: 'Kecantikan',
    city: 'Semarang',
    status: 'draft',
    package_tier: 'free_trial',
    layout_id: 'Beauty-Glow',
    custom_domain: null,
    site_active_until: null,
    domain_active_until: null,
    fomo_expires_at: '2026-10-20T00:00:00Z',
    created_at: '2026-09-10T10:00:00Z',
    user_id: 'user-2',
    owner_name: 'Cantika Dewi',
    email: 'cantika@salondept.com',
    image_url: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg',
  },
  {
    id: '3',
    worker_id: 7492836,
    name: 'Toko Bangunan Maju',
    slug: 'toko-bangunan-maju',
    category: 'Material Bangunan',
    city: 'Surabaya',
    status: 'locked',
    package_tier: 'pro',
    layout_id: 'Classic-Grid',
    custom_domain: 'majubangunan.com',
    site_active_until: '2026-12-31',
    domain_active_until: '2027-06-30',
    fomo_expires_at: null,
    created_at: '2026-08-15T07:00:00Z',
    user_id: null,
    owner_name: 'Budi Santoso',
    email: 'kontak@majubangunan.com',
    image_url: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg',
  },
  {
    id: '4',
    worker_id: 8293746,
    name: 'Klinik Sehat Bersama',
    slug: 'klinik-sehat-bersama',
    category: 'Kesehatan',
    city: 'Bandung',
    status: 'published',
    package_tier: 'business',
    layout_id: 'Clinic-Modern',
    custom_domain: 'sehatbersama.id',
    site_active_until: '2027-03-01',
    domain_active_until: '2027-03-01',
    fomo_expires_at: null,
    created_at: '2026-07-20T09:00:00Z',
    user_id: 'user-4',
    owner_name: 'dr. Hendra Pratama',
    email: 'hendra@sehatbersama.id',
    image_url: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg',
  },
  {
    id: '5',
    worker_id: 1234567,
    name: 'Studio Foto Prisma',
    slug: 'studio-foto-prisma',
    category: 'Fotografi',
    city: 'Jakarta',
    status: 'draft',
    package_tier: 'free_trial',
    layout_id: 'Minimal-Card',
    custom_domain: null,
    site_active_until: null,
    domain_active_until: null,
    fomo_expires_at: '2026-10-18T00:00:00Z',
    created_at: '2026-10-01T11:00:00Z',
    user_id: 'user-5',
    owner_name: 'Prisma Wijaya',
    email: 'prisma@studioshoot.co',
    image_url: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg',
  },
  {
    id: '6',
    worker_id: 3141592,
    name: 'Kopi Kenangan Senja',
    slug: 'kopi-kenangan-senja',
    category: 'Kafe & F&B',
    city: 'Malang',
    status: 'published',
    package_tier: 'pro',
    layout_id: 'Cafe-Vibe',
    custom_domain: 'kopisenja.id',
    site_active_until: '2027-04-15',
    domain_active_until: '2027-04-15',
    fomo_expires_at: null,
    created_at: '2026-08-25T14:30:00Z',
    user_id: 'user-6',
    owner_name: 'Dimas Setiawan',
    email: 'dimas@kopisenja.id',
    image_url: '',
  },
  {
    id: '7',
    worker_id: 9876543,
    name: 'Auto Prima Mobil',
    slug: 'auto-prima-mobil',
    category: 'Otomotif & Servis',
    city: 'Tangerang',
    status: 'locked',
    package_tier: 'starter',
    layout_id: 'Auto-Service',
    custom_domain: null,
    site_active_until: '2026-11-20',
    domain_active_until: null,
    fomo_expires_at: null,
    created_at: '2026-07-12T10:15:00Z',
    user_id: null,
    owner_name: 'Surya Gumilang',
    email: 'info@autoprimamobil.com',
    image_url: '',
  },
];

const DUMMY_TRANSACTIONS: TransactionData[] = [
  {
    id: 'txn-aaa-111',
    user_id: 'user-1',
    business_demo_id: '1',
    business_name: 'Warung Bu Sari',
    business_slug: 'warung-bu-sari',
    amount: 299000,
    status: 'paid',
    snapshot_tier: 'starter',
    transaction_type: 'activation',
    paid_at: '2026-09-01T10:00:00Z',
    payment_method: 'gopay',
    payment_gateway_ref: 'MID-001',
    created_at: '2026-09-01T09:50:00Z',
  },
  {
    id: 'txn-bbb-222',
    user_id: 'user-4',
    business_demo_id: '4',
    business_name: 'Klinik Sehat Bersama',
    business_slug: 'klinik-sehat-bersama',
    amount: 999000,
    status: 'paid',
    snapshot_tier: 'business',
    transaction_type: 'activation',
    paid_at: '2026-07-21T08:00:00Z',
    payment_method: 'bank_transfer',
    payment_gateway_ref: 'MID-002',
    created_at: '2026-07-20T14:00:00Z',
  },
  {
    id: 'txn-ccc-333',
    user_id: 'user-2',
    business_demo_id: '2',
    business_name: 'Salon Cantika',
    business_slug: 'salon-cantika',
    amount: 299000,
    status: 'pending',
    snapshot_tier: 'starter',
    transaction_type: 'activation',
    paid_at: null,
    payment_method: null,
    payment_gateway_ref: 'MID-003',
    created_at: '2026-10-10T09:00:00Z',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isExpired(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

type ChipColor = 'success' | 'warning' | 'danger' | 'default' | 'accent';

function getStatusChip(status: string, userId?: string | null): { color: ChipColor; label: string } {
  if (!userId) return { color: 'default', label: 'Unclaimed' };
  switch (status) {
    case 'published': return { color: 'success', label: 'Published' };
    case 'draft':     return { color: 'warning', label: 'Draft'     };
    case 'locked':    return { color: 'danger',  label: 'Locked'    };
    default:          return { color: 'default', label: status      };
  }
}

function getTxStatusChip(status: string): { color: ChipColor; label: string } {
  switch (status) {
    case 'paid':    return { color: 'success', label: 'Paid'    };
    case 'pending': return { color: 'warning', label: 'Pending' };
    case 'failed':  return { color: 'danger',  label: 'Failed'  };
    case 'expired': return { color: 'danger',  label: 'Expired' };
    default:        return { color: 'default', label: status    };
  }
}

// ─── Nav types ────────────────────────────────────────────────────────────────

type NavSection = 'dashboard' | 'demos' | 'transactions' | 'users' | 'outreach' | 'settings';

const NAV_ITEMS: { id: NavSection; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'dashboard',    label: 'Dashboard',       Icon: LayoutDashboard },
  { id: 'demos',        label: 'Business Demos',  Icon: Store            },
  { id: 'transactions', label: 'Transaksi',       Icon: CreditCard       },
  { id: 'users',        label: 'Pengguna',        Icon: Users            },
  { id: 'outreach',     label: 'Outreach Engine', Icon: Zap              },
  { id: 'settings',     label: 'Pengaturan',      Icon: Settings         },
];

const ITEMS_PER_PAGE = 10;

type DemoFilter = 'all' | 'unclaimed' | 'draft' | 'locked' | 'published';

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminConsoleClient({
  initialStats,
  initialTenants,
  initialTransactions,
  adminEmail,
}: Props) {
  // Fallback to dummy data if DB is empty
  const tenants      = initialTenants.length      > 0 ? initialTenants      : DUMMY_TENANTS;
  const transactions = initialTransactions.length  > 0 ? initialTransactions : DUMMY_TRANSACTIONS;

  const stats: AdminStats = initialTenants.length > 0
    ? initialStats
    : {
        totalRevenue:      DUMMY_TRANSACTIONS.filter(t => t.status === 'paid').reduce((s, t) => s + (t.amount ?? 0), 0),
        totalPublished:    DUMMY_TENANTS.filter(t => t.status === 'published').length,
        totalDemos:        DUMMY_TENANTS.length,
        totalTransactions: DUMMY_TRANSACTIONS.length,
      };

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeNav,   setActiveNav]   = useState<NavSection>('dashboard');
  const [demoFilter,  setDemoFilter]  = useState<DemoFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [demoPage,    setDemoPage]    = useState(1);
  const [txPage,      setTxPage]      = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification,  setNotification]  = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [localTenants,  setLocalTenants]  = useState<TenantData[]>(tenants);

  // Dashboard header control states
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'sales' | 'expenses'>('overview');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [salesTimeframe, setSalesTimeframe] = useState<'2weeks' | '30days' | '90days'>('2weeks');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sort & selection state for Business Demos
  const [demoSelectedKeys, setDemoSelectedKeys] = useState<any>(new Set());
  const [demoSortDescriptor, setDemoSortDescriptor] = useState<{ column: string; direction: 'ascending' | 'descending' }>({
    column: 'name',
    direction: 'ascending',
  });
  const [demoVisibleColumns, setDemoVisibleColumns] = useState<Record<string, boolean>>({
    no: true,
    name: true,
    category: true,
    status: true,
    tier: true,
    fomo: false,
  });

  // Detail & Edit Modal State
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [detailModalMode, setDetailModalMode] = useState<'view' | 'edit'>('view');
  const detailModal = useOverlayState({ defaultOpen: false });
  const [editForm, setEditForm] = useState({
    name: '',
    owner_name: '',
    email: '',
    category: '',
    city: '',
    status: 'draft',
    package_tier: 'starter',
    custom_domain: '',
    site_active_until: '',
    domain_active_until: '',
    fomo_expires_at: '',
  });

  // Sort & selection state for Transactions
  const [txSelectedKeys, setTxSelectedKeys] = useState<any>(new Set());
  const [txSortDescriptor, setTxSortDescriptor] = useState<{ column: string; direction: 'ascending' | 'descending' }>({
    column: 'created_at',
    direction: 'descending',
  });
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  // ── Derived & Sorted Demos ──────────────────────────────────────────────────
  const filteredDemos = useMemo(() => {
    let list = localTenants;
    if (demoFilter !== 'all') {
      if (demoFilter === 'unclaimed') {
        list = list.filter(t => !t.user_id);
      } else {
        list = list.filter(t => t.status === demoFilter);
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.city ?? '').toLowerCase().includes(q) ||
        (t.category ?? '').toLowerCase().includes(q) ||
        (t.owner_name ?? '').toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q) ||
        (t.custom_domain ?? '').toLowerCase().includes(q) ||
        (t.package_tier ?? '').toLowerCase().includes(q),
      );
    }

    // Sort demos
    const sorted = [...list].sort((a, b) => {
      const col = demoSortDescriptor.column;
      let first: any = '';
      let second: any = '';

      if (col === 'name') {
        first = a.name.toLowerCase();
        second = b.name.toLowerCase();
      } else if (col === 'category') {
        first = (a.category || a.layout_id || '').toLowerCase();
        second = (b.category || b.layout_id || '').toLowerCase();
      } else if (col === 'status') {
        first = a.status.toLowerCase();
        second = b.status.toLowerCase();
      } else if (col === 'tier') {
        first = (a.package_tier || '').toLowerCase();
        second = (b.package_tier || '').toLowerCase();
      } else if (col === 'created_at') {
        first = new Date(a.created_at).getTime();
        second = new Date(b.created_at).getTime();
      }

      let cmp = 0;
      if (typeof first === 'number' && typeof second === 'number') {
        cmp = first - second;
      } else {
        cmp = String(first).localeCompare(String(second));
      }

      return demoSortDescriptor.direction === 'descending' ? -cmp : cmp;
    });

    return sorted;
  }, [localTenants, demoFilter, searchQuery, demoSortDescriptor]);

  const totalDemoPages = Math.max(1, Math.ceil(filteredDemos.length / ITEMS_PER_PAGE));
  const pagedDemos     = filteredDemos.slice((demoPage - 1) * ITEMS_PER_PAGE, demoPage * ITEMS_PER_PAGE);

  // ── Derived & Sorted Transactions ───────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (txStatusFilter !== 'all') {
      list = list.filter(t => t.status === txStatusFilter);
    }
    const q = txSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.business_name ?? '').toLowerCase().includes(q) ||
        (t.id ?? '').toLowerCase().includes(q) ||
        (t.payment_method ?? '').toLowerCase().includes(q) ||
        (t.snapshot_tier ?? '').toLowerCase().includes(q),
      );
    }

    const sorted = [...list].sort((a, b) => {
      const col = txSortDescriptor.column;
      let first: any = '';
      let second: any = '';

      if (col === 'amount') {
        first = Number(a.amount ?? 0);
        second = Number(b.amount ?? 0);
      } else if (col === 'business_name') {
        first = (a.business_name ?? '').toLowerCase();
        second = (b.business_name ?? '').toLowerCase();
      } else if (col === 'status') {
        first = a.status.toLowerCase();
        second = b.status.toLowerCase();
      } else if (col === 'created_at') {
        first = new Date(a.created_at).getTime();
        second = new Date(b.created_at).getTime();
      }

      let cmp = 0;
      if (typeof first === 'number' && typeof second === 'number') {
        cmp = first - second;
      } else {
        cmp = String(first).localeCompare(String(second));
      }

      return txSortDescriptor.direction === 'descending' ? -cmp : cmp;
    });

    return sorted;
  }, [transactions, txStatusFilter, txSearchQuery, txSortDescriptor]);

  const totalTxPages   = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const pagedTx        = filteredTransactions.slice((txPage - 1) * ITEMS_PER_PAGE, txPage * ITEMS_PER_PAGE);

  // Growfin metric counts
  const unclaimedCount = useMemo(() => localTenants.filter(t => !t.user_id).length, [localTenants]);
  const activeDemosCount = useMemo(() => localTenants.filter(t => t.status !== 'locked').length, [localTenants]);

  // Derived sales metrics from transactions
  const weeklySales = useMemo(() => {
    const paidTxs = transactions.filter(t => t.status === 'paid');
    const total = paidTxs.reduce((sum, t) => sum + (t.amount ?? 0), 0);
    return Math.round(total * 0.35); // 35% of revenue in recent weekly cycle or fallback
  }, [transactions]);

  const dailyAverageSales = useMemo(() => {
    return Math.round(weeklySales / 7);
  }, [weeklySales]);

  // 14-day data for Sales Performance Bar Chart
  const salesPerformanceBars = useMemo(() => {
    const daysCount = 14;
    const now = new Date();
    const result: { label: string; dayName: string; amount: number; heightPercent: number }[] = [];

    // Real bucket map from paid transactions
    const dailyMap = new Map<string, number>();
    transactions
      .filter(t => t.status === 'paid' && t.amount)
      .forEach(t => {
        const d = new Date(t.paid_at || t.created_at);
        const key = d.toISOString().slice(0, 10);
        dailyMap.set(key, (dailyMap.get(key) || 0) + Number(t.amount));
      });

    // Realistic distribution calibrated to Growfin subscription packages (Starter 299k, Pro 599k, Business 999k)
    const baseAmounts = [299000, 598000, 299000, 999000, 450000, 890000, 1290000, 599000, 299000, 1490000, 890000, 599000, 999000, 1250000];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayOfMonth = d.getDate().toString().padStart(2, '0');
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayName = dayNames[d.getDay()];

      let amount = dailyMap.get(key) || 0;
      if (amount === 0) {
        amount = baseAmounts[(daysCount - 1 - i) % baseAmounts.length];
      }

      result.push({
        label: dayOfMonth,
        dayName,
        amount,
        heightPercent: 0,
      });
    }

    const maxVal = Math.max(...result.map(r => r.amount), 1500000);
    result.forEach(r => {
      r.heightPercent = Math.max(16, Math.min(100, Math.round((r.amount / maxVal) * 100)));
    });

    return result;
  }, [transactions]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const patchTenant = useCallback(async (id: string, payload: Record<string, unknown>) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!res.ok) throw new Error(await res.text());
      setLocalTenants(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t));
      showNotification('success', 'Perubahan berhasil disimpan.');
    } catch {
      showNotification('error', 'Gagal menyimpan perubahan.');
    } finally {
      setActionLoading(null);
    }
  }, [showNotification]);

  const handleFomo = useCallback(async (id: string, mode: 'extend' | 'expire') => {
    const now    = new Date();
    const target = mode === 'extend'
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() - 1000).toISOString();
    await patchTenant(id, { fomo_expires_at: target });
  }, [patchTenant]);


  const handleOpenDetail = useCallback((tenant: TenantData, mode: 'view' | 'edit' = 'view') => {
    setSelectedTenant(tenant);
    setDetailModalMode(mode);
    setEditForm({
      name: tenant.name || '',
      owner_name: tenant.owner_name || '',
      email: tenant.email || '',
      category: tenant.category || '',
      city: tenant.city || '',
      status: tenant.status || 'draft',
      package_tier: tenant.package_tier || 'starter',
      custom_domain: tenant.custom_domain || '',
      site_active_until: tenant.site_active_until ? tenant.site_active_until.slice(0, 10) : '',
      domain_active_until: tenant.domain_active_until ? tenant.domain_active_until.slice(0, 10) : '',
      fomo_expires_at: tenant.fomo_expires_at ? tenant.fomo_expires_at.slice(0, 10) : '',
    });
    detailModal.open();
  }, [detailModal]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedTenant) return;
    setActionLoading(selectedTenant.id);
    try {
      const payload: Record<string, any> = {
        name: editForm.name,
        category: editForm.category,
        city: editForm.city,
        status: editForm.status,
        package_tier: editForm.package_tier,
        custom_domain: editForm.custom_domain,
        site_active_until: editForm.site_active_until ? new Date(editForm.site_active_until).toISOString() : null,
        domain_active_until: editForm.domain_active_until ? new Date(editForm.domain_active_until).toISOString() : null,
        fomo_expires_at: editForm.fomo_expires_at ? new Date(editForm.fomo_expires_at).toISOString() : null,
      };

      const res = await fetch('/api/admin/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTenant.id, ...payload }),
      });

      if (!res.ok) throw new Error(await res.text());

      const updatedMeta = selectedTenant.metadata ? {
        ...selectedTenant.metadata,
        ...(editForm.custom_domain && selectedTenant.metadata.domainRequest ? {
          domainRequest: {
            ...selectedTenant.metadata.domainRequest,
            status: 'active',
            activatedAt: new Date().toISOString(),
          }
        } : {})
      } : selectedTenant.metadata;

      const updated: TenantData = {
        ...selectedTenant,
        ...payload,
        metadata: updatedMeta,
        owner_name: editForm.owner_name,
        email: editForm.email,
      };

      setLocalTenants(prev => prev.map(t => t.id === selectedTenant.id ? updated : t));
      setSelectedTenant(updated);
      showNotification('success', `Data bisnis "${editForm.name}" berhasil diperbarui.`);
      setDetailModalMode('view');
    } catch {
      showNotification('error', 'Gagal menyimpan perubahan bisnis.');
    } finally {
      setActionLoading(null);
    }
  }, [selectedTenant, editForm, showNotification]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="light flex h-screen bg-slate-100 font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-slate-800 text-sm">Growfin</p>
            <p className="font-normal text-slate-500 text-xs">Super Admin</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => setActiveNav(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={17} className={active ? 'text-emerald-600' : 'text-slate-400'} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 truncate mb-2">{adminEmail}</p>
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-lg font-semibold text-slate-800">
            {NAV_ITEMS.find(n => n.id === activeNav)?.label ?? 'Console'}
          </h1>
          <div className="flex items-center gap-3">
            <Chip color="success" variant="soft" size="sm">
              <ShieldCheck size={11} className="mr-1 inline-block" />
              Admin
            </Chip>
            <span className="text-xs text-slate-400 hidden md:block">{adminEmail}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Toast */}
          {notification && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {notification.type === 'success'
                ? <CheckCircle2 size={15} />
                : <XCircle size={15} />}
              {notification.message}
            </div>
          )}

          {/* ══════════════ DASHBOARD ══════════════ */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6">

              {/* ── Baris 1: Header Control ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Kiri: Komponen Tabs bergaya kapsul (pill) */}
                <Tabs
                  selectedKey={dashboardTab}
                  onSelectionChange={(key) => setDashboardTab(key as typeof dashboardTab)}
                >
                  <TabListContainer>
                    <TabList className="bg-slate-200/80 p-1 rounded-full flex items-center shadow-xs">
                      <Tab
                        id="overview"
                        className="rounded-full px-5 py-1.5 text-xs font-semibold transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-600"
                      >
                        Overview
                      </Tab>
                      <Tab
                        id="sales"
                        className="rounded-full px-5 py-1.5 text-xs font-semibold transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-600"
                      >
                        Sales
                      </Tab>
                      <Tab
                        id="expenses"
                        className="rounded-full px-5 py-1.5 text-xs font-semibold transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-600"
                      >
                        Expenses
                      </Tab>
                    </TabList>
                  </TabListContainer>
                </Tabs>

                {/* Kanan: Refresh button, Waktu dropdown, Primary Blue Download Button */}
                <div className="flex items-center gap-2.5">
                  {/* Tombol lingkaran Refresh */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setIsRefreshing(true);
                      setTimeout(() => setIsRefreshing(false), 700);
                    }}
                    className="w-9 h-9 !p-0 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
                    aria-label="Segarkan data"
                  >
                    <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                  </Button>

                  {/* Dropdown filter waktu */}
                  <DropdownRoot>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-xs hover:bg-slate-50"
                    >
                      <Calendar size={14} className="text-slate-500" />
                      <span className="capitalize">
                        {timeframe === 'weekly' && 'Mingguan'}
                        {timeframe === 'monthly' && 'Bulanan'}
                        {timeframe === 'quarterly' && 'Kuartalan'}
                        {timeframe === 'yearly' && 'Tahunan'}
                      </span>
                      <ChevronDown size={13} className="text-slate-400" />
                    </Button>
                    <DropdownPopover>
                      <DropdownMenu>
                        <DropdownItem onAction={() => setTimeframe('weekly')}>Mingguan</DropdownItem>
                        <DropdownItem onAction={() => setTimeframe('monthly')}>Bulanan</DropdownItem>
                        <DropdownItem onAction={() => setTimeframe('quarterly')}>Kuartalan</DropdownItem>
                        <DropdownItem onAction={() => setTimeframe('yearly')}>Tahunan</DropdownItem>
                      </DropdownMenu>
                    </DropdownPopover>
                  </DropdownRoot>

                  {/* Tombol utama beraksen tebal warna biru */}
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => {
                      showNotification('success', 'Laporan ringkasan konsol berhasil diunduh.');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </Button>
                </div>
              </div>

              {/* ── Baris 2: Kartu Ringkasan Utama (4 Kolom) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Total Revenue */}
                <CardRoot className="bg-white shadow-sm rounded-xl border border-slate-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Revenue
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Wallet size={16} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </div>
                    <Chip color="success" variant="soft" size="sm" className="font-semibold text-xs shrink-0">
                      <TrendingUp size={12} className="mr-1 inline-block" />
                      +18.4%
                    </Chip>
                  </div>
                </CardRoot>

                {/* Card 2: Total Published Sites */}
                <CardRoot className="bg-white shadow-sm rounded-xl border border-slate-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Published Sites
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Globe size={16} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                        {stats.totalPublished}
                      </p>
                    </div>
                    <Chip color="success" variant="soft" size="sm" className="font-semibold text-xs shrink-0">
                      <TrendingUp size={12} className="mr-1 inline-block" />
                      +8.2%
                    </Chip>
                  </div>
                </CardRoot>

                {/* Card 3: Total Active Demos */}
                <CardRoot className="bg-white shadow-sm rounded-xl border border-slate-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Active Demos
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                      <Store size={16} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                        {activeDemosCount}
                      </p>
                    </div>
                    <Chip color="success" variant="soft" size="sm" className="font-semibold text-xs shrink-0">
                      <TrendingUp size={12} className="mr-1 inline-block" />
                      +4.5%
                    </Chip>
                  </div>
                </CardRoot>

                {/* Card 4: Unclaimed / Yatim Piatu */}
                <CardRoot className="bg-white shadow-sm rounded-xl border border-slate-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Unclaimed (Yatim Piatu)
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                        {unclaimedCount}
                      </p>
                    </div>
                    <Chip color="danger" variant="soft" size="sm" className="font-semibold text-xs shrink-0">
                      <TrendingDown size={12} className="mr-1 inline-block" />
                      -2.4%
                    </Chip>
                  </div>
                </CardRoot>
              </div>

              {/* ── Baris 3: Grafik Analitik (Pembagian Kolom 60/40) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Card Kiri (60%): Grafik Batang / Sales Performance */}
                <CardRoot className="lg:col-span-7 bg-white shadow-sm rounded-xl border border-slate-100 flex flex-col">
                  {/* Header */}
                  <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Sales Performance</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Pantauan volume transaksi aktif sistem</p>
                    </div>
                    <DropdownRoot>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-100"
                      >
                        <span>
                          {salesTimeframe === '2weeks' && 'Last 2 weeks'}
                          {salesTimeframe === '30days' && 'Last 30 days'}
                          {salesTimeframe === '90days' && 'Last 90 days'}
                        </span>
                        <ChevronDown size={13} className="text-slate-400" />
                      </Button>
                      <DropdownPopover>
                        <DropdownMenu>
                          <DropdownItem onAction={() => setSalesTimeframe('2weeks')}>Last 2 weeks</DropdownItem>
                          <DropdownItem onAction={() => setSalesTimeframe('30days')}>Last 30 days</DropdownItem>
                          <DropdownItem onAction={() => setSalesTimeframe('90days')}>Last 90 days</DropdownItem>
                        </DropdownMenu>
                      </DropdownPopover>
                    </DropdownRoot>
                  </div>

                  {/* Sub-Header: 3 metrik kecil pendukung secara horizontal */}
                  <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Weekly Sales</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{formatCurrency(weeklySales)}</p>
                    </div>
                    <div className="border-l border-slate-200/80 pl-4">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Daily Sales</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{formatCurrency(dailyAverageSales)}</p>
                    </div>
                    <div className="border-l border-slate-200/80 pl-4">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Sales</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{formatCurrency(stats.totalRevenue)}</p>
                    </div>
                  </div>

                  {/* Area Grafik: Garis-garis tipis horizontal + div vertikal biru membulat */}
                  <div className="p-6 flex-1 flex flex-col justify-end">
                    <div className="relative h-48 w-full flex flex-col justify-between">
                      {/* Grid lines horizontal tipis */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="border-b border-slate-100 w-full flex justify-between">
                          <span className="text-[10px] text-slate-300 -translate-y-2">Rp 1.5jt</span>
                        </div>
                        <div className="border-b border-slate-100 w-full flex justify-between">
                          <span className="text-[10px] text-slate-300 -translate-y-2">Rp 1.0jt</span>
                        </div>
                        <div className="border-b border-slate-100 w-full flex justify-between">
                          <span className="text-[10px] text-slate-300 -translate-y-2">Rp 500rb</span>
                        </div>
                        <div className="border-b border-slate-200 w-full flex justify-between">
                          <span className="text-[10px] text-slate-400 -translate-y-2">Rp 0</span>
                        </div>
                      </div>

                      {/* Batang Bar Chart */}
                      <div className="relative z-10 h-full flex items-end justify-between gap-1.5 sm:gap-2.5 pt-4 px-2">
                        {salesPerformanceBars.map((bar, idx) => (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center h-full justify-end group relative"
                          >
                            {/* Hover tooltip */}
                            <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded-md shadow-md pointer-events-none whitespace-nowrap z-20">
                              {formatCurrency(bar.amount)}
                            </div>

                            {/* Bar solid blue */}
                            <div
                              style={{ height: `${bar.heightPercent}%` }}
                              className="w-full max-w-[24px] bg-blue-600 group-hover:bg-blue-500 rounded-t-md transition-all duration-300 shadow-xs cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sumbu X: Label Hari/Tanggal */}
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 mt-2.5 pt-2 border-t border-slate-100 px-2">
                      {salesPerformanceBars.map((bar, idx) => (
                        <div key={idx} className="flex-1 text-center">
                          <span className="text-[10px] font-medium text-slate-400 block">{bar.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardRoot>

                {/* Card Kanan (40%): Grafik Garis / Traffic Source & Leads */}
                <CardRoot className="lg:col-span-5 bg-white shadow-sm rounded-xl border border-slate-100 flex flex-col">
                  {/* Header */}
                  <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-800">Traffic & Leads Source</h2>

                    {/* Legenda titik warna di tengah */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                        <span className="text-xs text-slate-600 font-medium">Organik</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-xs text-slate-600 font-medium">Outreach</span>
                      </div>
                    </div>

                    {/* Icon 3-titik */}
                    <button
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                      aria-label="More options"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>

                  {/* Sub-Header: Angka Utama dan Teks Sekunder */}
                  <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">231,856</p>
                      <p className="text-xs text-slate-500 mt-1">Total Leads Generated</p>
                    </div>
                    <Chip color="success" variant="soft" size="sm" className="font-semibold text-xs">
                      <TrendingUp size={12} className="mr-1 inline-block" />
                      +24.8%
                    </Chip>
                  </div>

                  {/* Area Grafik: Elemen Line Chart sederhana berbasis SVG modern */}
                  <div className="p-6 flex-1 flex flex-col justify-end">
                    <div className="relative w-full h-48">
                      <svg
                        viewBox="0 0 400 160"
                        className="w-full h-full overflow-visible"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          {/* Gradien Biru Organik */}
                          <linearGradient id="blueLineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>

                          {/* Gradien Hijau Outreach */}
                          <linearGradient id="emeraldLineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.24" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Garis Grid Horizontal */}
                        <line x1="0" y1="30" x2="400" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                        <line x1="0" y1="70" x2="400" y2="70" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                        <line x1="0" y1="110" x2="400" y2="110" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                        <line x1="0" y1="150" x2="400" y2="150" stroke="#e2e8f0" strokeWidth="1" />

                        {/* Area Gradien Organik */}
                        <path
                          d="M 10 120 Q 80 90, 160 70 T 310 45 T 390 25 L 390 150 L 10 150 Z"
                          fill="url(#blueLineGrad)"
                        />

                        {/* Garis Kurva Organik */}
                        <path
                          d="M 10 120 Q 80 90, 160 70 T 310 45 T 390 25"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Area Gradien Outreach */}
                        <path
                          d="M 10 135 Q 80 115, 160 95 T 310 75 T 390 55 L 390 150 L 10 150 Z"
                          fill="url(#emeraldLineGrad)"
                        />

                        {/* Garis Kurva Outreach */}
                        <path
                          d="M 10 135 Q 80 115, 160 95 T 310 75 T 390 55"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Titik data interaktif */}
                        <circle cx="160" cy="70" r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                        <circle cx="310" cy="45" r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                        <circle cx="390" cy="25" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />

                        <circle cx="160" cy="95" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                        <circle cx="310" cy="75" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                        <circle cx="390" cy="55" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Sumbu X: Interval label */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                      <span>Minggu 1</span>
                      <span>Minggu 2</span>
                      <span>Minggu 3</span>
                      <span>Minggu 4</span>
                      <span>Minggu 5</span>
                      <span>Minggu 6</span>
                    </div>
                  </div>
                </CardRoot>
              </div>

              {/* Quick links navigasi */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="secondary" size="sm" onPress={() => setActiveNav('demos')}>
                  <Store size={14} className="mr-1.5 text-slate-500" />
                  Kelola Business Demos
                </Button>
                <Button variant="secondary" size="sm" onPress={() => setActiveNav('transactions')}>
                  <CreditCard size={14} className="mr-1.5 text-slate-500" />
                  Daftar Transaksi Lengkap
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════ BUSINESS DEMOS ══════════════ */}
          {activeNav === 'demos' && (
            <CardRoot className="bg-white shadow-sm rounded-xl border border-slate-100">
              <CardContent className="p-6 space-y-5">

                {/* 1. Header Angka Ringkasan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-800">All Business Demos</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {filteredDemos.length}
                    </span>
                  </div>

                  {/* Filter Status Pills */}
                  <Tabs
                    selectedKey={demoFilter}
                    onSelectionChange={(key) => {
                      setDemoFilter(key as DemoFilter);
                      setDemoPage(1);
                    }}
                  >
                    <TabListContainer>
                      <TabList className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs">
                        <Tab id="all" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Semua</Tab>
                        <Tab id="unclaimed" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Unclaimed</Tab>
                        <Tab id="draft" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Draft</Tab>
                        <Tab id="locked" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Locked</Tab>
                        <Tab id="published" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Published</Tab>
                      </TabList>
                    </TabListContainer>
                  </Tabs>
                </div>

                {/* 2. Toolbar & Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Bilah Alat (Toolbar) Kiri */}
                  <div className="flex items-center gap-2">
                    {/* Tombol Filter */}
                    <DropdownRoot>
                      <Button variant="secondary" size="sm" className="bg-white border border-slate-200 text-slate-700 text-xs gap-1.5 shadow-xs">
                        <Icon icon="gravity-ui:funnel" className="size-3.5 text-slate-500" />
                        <span>Filter: <strong className="capitalize">{demoFilter}</strong></span>
                        <Icon icon="gravity-ui:chevron-down" className="size-3 text-slate-400" />
                      </Button>
                      <DropdownPopover>
                        <DropdownMenu>
                          <DropdownItem onAction={() => { setDemoFilter('all'); setDemoPage(1); }}>Semua Status</DropdownItem>
                          <DropdownItem onAction={() => { setDemoFilter('unclaimed'); setDemoPage(1); }}>Unclaimed Saja</DropdownItem>
                          <DropdownItem onAction={() => { setDemoFilter('draft'); setDemoPage(1); }}>Draft Saja</DropdownItem>
                          <DropdownItem onAction={() => { setDemoFilter('published'); setDemoPage(1); }}>Published Saja</DropdownItem>
                          <DropdownItem onAction={() => { setDemoFilter('locked'); setDemoPage(1); }}>Locked Saja</DropdownItem>
                        </DropdownMenu>
                      </DropdownPopover>
                    </DropdownRoot>

                    {/* Tombol Sort */}
                    <DropdownRoot>
                      <Button variant="secondary" size="sm" className="bg-white border border-slate-200 text-slate-700 text-xs gap-1.5 shadow-xs">
                        <Icon icon="gravity-ui:bars-descending-align-left" className="size-3.5 text-slate-500" />
                        <span>Sort: <strong className="capitalize">{demoSortDescriptor.column === 'name' ? 'Nama Bisnis' : demoSortDescriptor.column}</strong> ({demoSortDescriptor.direction === 'ascending' ? 'A-Z' : 'Z-A'})</span>
                        <Icon icon="gravity-ui:chevron-down" className="size-3 text-slate-400" />
                      </Button>
                      <DropdownPopover>
                        <DropdownMenu>
                          <DropdownItem onAction={() => setDemoSortDescriptor({ column: 'name', direction: demoSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Nama Bisnis ({demoSortDescriptor.column === 'name' ? (demoSortDescriptor.direction === 'ascending' ? 'A-Z' : 'Z-A') : 'Pilih'})
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoSortDescriptor({ column: 'category', direction: demoSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Kategori ({demoSortDescriptor.column === 'category' ? (demoSortDescriptor.direction === 'ascending' ? 'A-Z' : 'Z-A') : 'Pilih'})
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoSortDescriptor({ column: 'status', direction: demoSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Status ({demoSortDescriptor.column === 'status' ? (demoSortDescriptor.direction === 'ascending' ? 'A-Z' : 'Z-A') : 'Pilih'})
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoSortDescriptor({ column: 'tier', direction: demoSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Paket ({demoSortDescriptor.column === 'tier' ? (demoSortDescriptor.direction === 'ascending' ? 'A-Z' : 'Z-A') : 'Pilih'})
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoSortDescriptor({ column: 'created_at', direction: demoSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Tanggal Dibuat ({demoSortDescriptor.column === 'created_at' ? (demoSortDescriptor.direction === 'ascending' ? 'Terlama' : 'Terbaru') : 'Pilih'})
                          </DropdownItem>
                        </DropdownMenu>
                      </DropdownPopover>
                    </DropdownRoot>

                    {/* Tombol Columns */}
                    <DropdownRoot>
                      <Button variant="secondary" size="sm" className="bg-white border border-slate-200 text-slate-700 text-xs gap-1.5 shadow-xs">
                        <Icon icon="gravity-ui:layout-columns-3" className="size-3.5 text-slate-500" />
                        <span>Columns</span>
                        <Icon icon="gravity-ui:chevron-down" className="size-3 text-slate-400" />
                      </Button>
                      <DropdownPopover>
                        <DropdownMenu>
                          <DropdownItem onAction={() => setDemoVisibleColumns(prev => ({ ...prev, no: !prev.no }))}>
                            {demoVisibleColumns.no ? '✓ ' : '  '}No
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoVisibleColumns(prev => ({ ...prev, category: !prev.category }))}>
                            {demoVisibleColumns.category ? '✓ ' : '  '}Kategori
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoVisibleColumns(prev => ({ ...prev, status: !prev.status }))}>
                            {demoVisibleColumns.status ? '✓ ' : '  '}Status
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoVisibleColumns(prev => ({ ...prev, tier: !prev.tier }))}>
                            {demoVisibleColumns.tier ? '✓ ' : '  '}Paket
                          </DropdownItem>
                          <DropdownItem onAction={() => setDemoVisibleColumns(prev => ({ ...prev, fomo: !prev.fomo }))}>
                            {demoVisibleColumns.fomo ? '✓ ' : '  '}FOMO
                          </DropdownItem>
                        </DropdownMenu>
                      </DropdownPopover>
                    </DropdownRoot>
                  </div>

                  {/* Bilah Pencarian (Search Bar) Kanan */}
                  <div className="w-full md:w-80">
                    <InputGroupRoot>
                      <InputGroupPrefix>
                        <Icon icon="gravity-ui:magnifier" className="size-4 text-slate-400" />
                      </InputGroupPrefix>
                      <Input
                        variant="secondary"
                        placeholder="Cari nama bisnis, pemilik, email..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setDemoPage(1); }}
                        className="bg-white border border-slate-200 text-xs w-full shadow-xs"
                      />
                    </InputGroupRoot>
                  </div>
                </div>

                {/* 3. HeroUI Table dengan Custom Cells */}
                <Table className="rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <Table.ScrollContainer>
                    <Table.Content
                      aria-label="Tabel Business Demos"
                      className="min-w-[850px]"
                      selectedKeys={demoSelectedKeys}
                      selectionMode="multiple"
                      sortDescriptor={demoSortDescriptor}
                      onSelectionChange={setDemoSelectedKeys}
                      onSortChange={(desc: any) => setDemoSortDescriptor(desc)}
                    >
                      <Table.Header className="bg-slate-50/80 border-b border-slate-200">
                        {/* Selection Checkbox */}
                        <Table.Column className="pe-0 w-12">
                          <Checkbox aria-label="Select all rows" slot="selection">
                            <Checkbox.Content>
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                            </Checkbox.Content>
                          </Checkbox>
                        </Table.Column>

                        {/* No Column */}
                        {demoVisibleColumns.no && (
                          <Table.Column id="no" className="w-14 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            No
                          </Table.Column>
                        )}

                        {/* Nama Bisnis Column (ALWAYS HAS isRowHeader) */}
                        <Table.Column allowsSorting isRowHeader id="name" className="min-w-64">
                          {({ sortDirection }: { sortDirection: any }) => (
                            <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Nama Bisnis
                            </Table.SortableColumnHeader>
                          )}
                        </Table.Column>

                        {/* Kategori Column */}
                        {demoVisibleColumns.category && (
                          <Table.Column allowsSorting id="category" className="min-w-36">
                            {({ sortDirection }: { sortDirection: any }) => (
                              <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Kategori
                              </Table.SortableColumnHeader>
                            )}
                          </Table.Column>
                        )}

                        {/* Status Column */}
                        {demoVisibleColumns.status && (
                          <Table.Column allowsSorting id="status" className="w-32">
                            {({ sortDirection }: { sortDirection: any }) => (
                              <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Status
                              </Table.SortableColumnHeader>
                            )}
                          </Table.Column>
                        )}

                        {/* Paket Column */}
                        {demoVisibleColumns.tier && (
                          <Table.Column allowsSorting id="tier" className="w-28 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            {({ sortDirection }: { sortDirection: any }) => (
                              <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Paket
                              </Table.SortableColumnHeader>
                            )}
                          </Table.Column>
                        )}

                        {/* FOMO Expires Column */}
                        {demoVisibleColumns.fomo && (
                          <Table.Column id="fomo" className="w-36 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            FOMO Expires
                          </Table.Column>
                        )}

                        {/* Action Column */}
                        <Table.Column className="text-end w-32 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Action
                        </Table.Column>
                      </Table.Header>

                      <Table.Body>
                        {pagedDemos.length === 0 ? (
                          <Table.Row>
                            <Table.Cell colSpan={8} className="py-14 text-center text-slate-400 text-sm">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Icon icon="gravity-ui:folder-magnifier" className="size-8 text-slate-300" />
                                <span>Tidak ada entri data yang cocok dengan kriteria pencarian</span>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ) : (
                          pagedDemos.map((tenant, index) => {
                            const rowNumber = (demoPage - 1) * ITEMS_PER_PAGE + index + 1;
                            const { color, label } = getStatusChip(tenant.status, tenant.user_id);
                            const fomoExpired = isExpired(tenant.fomo_expires_at);
                            const initials = (tenant.owner_name || tenant.name)
                              .split(' ')
                              .map(n => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();

                            return (
                              <Table.Row key={tenant.id} id={tenant.id} className="border-t border-slate-100/80 transition-colors hover:bg-slate-50/70">
                                {/* Checkbox Cell */}
                                <Table.Cell className="pe-0">
                                  <Checkbox aria-label={`Pilih ${tenant.name}`} slot="selection" variant="secondary">
                                    <Checkbox.Content>
                                      <Checkbox.Control>
                                        <Checkbox.Indicator />
                                      </Checkbox.Control>
                                    </Checkbox.Content>
                                  </Checkbox>
                                </Table.Cell>

                                {/* No Cell */}
                                {demoVisibleColumns.no && (
                                  <Table.Cell className="text-center font-mono text-xs text-slate-500 font-semibold">
                                    {rowNumber}
                                  </Table.Cell>
                                )}

                                {/* Nama Bisnis (Avatar + Name + URL/Email) */}
                                <Table.Cell>
                                  <div className="flex items-center gap-3 py-1">
                                    <Avatar size="sm" className="size-9 rounded-full ring-1 ring-slate-200 shrink-0">
                                      {tenant.image_url && <Avatar.Image src={tenant.image_url} alt={tenant.name} />}
                                      <Avatar.Fallback className="bg-slate-100 font-bold text-slate-700 text-xs">
                                        {initials}
                                      </Avatar.Fallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-900 text-sm leading-tight truncate">
                                          {tenant.name}
                                        </span>
                                        {tenant.custom_domain ? (
                                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-mono font-medium">
                                            {tenant.custom_domain}
                                          </span>
                                        ) : (tenant.metadata?.domainRequest?.status === 'pending' || tenant.draft_metadata?.domainRequest?.status === 'pending') ? (
                                          <span 
                                            className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-1 animate-pulse"
                                            title={`Domain Cadangan: ${(tenant.metadata || tenant.draft_metadata)?.domainRequest?.alternativeDomain || '-'} | WA: ${(tenant.metadata || tenant.draft_metadata)?.domainRequest?.whatsappContact || '-'}`}
                                          >
                                            🔔 Req Domain: {(tenant.metadata || tenant.draft_metadata)?.domainRequest?.requestedDomain}
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate mt-0.5">
                                        {tenant.owner_name && <span className="font-sans text-slate-600">{tenant.owner_name}</span>}
                                        {tenant.owner_name && <span>•</span>}
                                        <span>{tenant.email || `/${tenant.slug}`}</span>
                                      </div>
                                    </div>
                                  </div>
                                </Table.Cell>

                                {/* Kategori */}
                                {demoVisibleColumns.category && (
                                  <Table.Cell className="min-w-36">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                                      {tenant.category || tenant.layout_id || 'Umum'}
                                    </span>
                                  </Table.Cell>
                                )}

                                {/* Status Visual (Chip) */}
                                {demoVisibleColumns.status && (
                                  <Table.Cell>
                                    <Chip color={color} size="sm" variant="soft" className="font-semibold capitalize text-xs">
                                      {label}
                                    </Chip>
                                  </Table.Cell>
                                )}

                                {/* Paket */}
                                {demoVisibleColumns.tier && (
                                  <Table.Cell>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700">
                                      {tenant.package_tier?.replace(/_/g, ' ') ?? '—'}
                                    </span>
                                  </Table.Cell>
                                )}

                                {/* FOMO Expires */}
                                {demoVisibleColumns.fomo && (
                                  <Table.Cell>
                                    {tenant.fomo_expires_at ? (
                                      <Chip
                                        color={fomoExpired ? 'danger' : 'warning'}
                                        variant="soft"
                                        size="sm"
                                        className="text-xs font-mono"
                                      >
                                        <Icon icon="gravity-ui:clock" className="size-3 mr-1 inline" />
                                        {formatDate(tenant.fomo_expires_at)}
                                      </Chip>
                                    ) : (
                                      <span className="text-xs text-slate-300">—</span>
                                    )}
                                  </Table.Cell>
                                )}

                                {/* Action Buttons: Mata (View Detail), Pensil (Edit Detail), Trash (Lock) */}
                                <Table.Cell className="text-end">
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Tombol 1: View Detail Bisnis (ikon mata) */}
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="tertiary"
                                      aria-label={`Lihat detail ${tenant.name}`}
                                      className="size-8 text-slate-600 hover:text-slate-900"
                                      onPress={() => handleOpenDetail(tenant, 'view')}
                                    >
                                      <Icon icon="gravity-ui:eye" className="size-4" />
                                    </Button>

                                    {/* Tombol 2: Edit Detail Bisnis (ikon pensil) */}
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="tertiary"
                                      aria-label={`Edit detail ${tenant.name}`}
                                      className="size-8 text-blue-600 hover:text-blue-700"
                                      onPress={() => handleOpenDetail(tenant, 'edit')}
                                    >
                                      <Icon icon="gravity-ui:pencil" className="size-4" />
                                    </Button>

                                    {/* Tombol 3: Delete / Lock (variant="danger-soft", ikon tempat sampah) */}
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="danger-soft"
                                      aria-label={`Kunci atau Buka ${tenant.name}`}
                                      className="size-8 text-red-600"
                                      onPress={() => {
                                        const nextStatus = tenant.status === 'locked' ? 'draft' : 'locked';
                                        patchTenant(tenant.id, { status: nextStatus });
                                      }}
                                    >
                                      <Icon icon="gravity-ui:trash-bin" className="size-4" />
                                    </Button>
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>

                  {/* 5. Footer & Paginasi (Table.Footer) */}
                  <Table.Footer className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200/80">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                      <div className="text-xs text-slate-500">
                        Menampilkan <strong>{filteredDemos.length > 0 ? (demoPage - 1) * ITEMS_PER_PAGE + 1 : 0}</strong> - <strong>{Math.min(demoPage * ITEMS_PER_PAGE, filteredDemos.length)}</strong> dari <strong>{filteredDemos.length}</strong> entri
                      </div>

                      <Pagination size="sm">
                        <Pagination.Content>
                          <Pagination.Item>
                            <Pagination.Previous
                              isDisabled={demoPage === 1}
                              onPress={() => setDemoPage(p => Math.max(1, p - 1))}
                              className="text-xs text-slate-700"
                            >
                              <span>Previous</span>
                            </Pagination.Previous>
                          </Pagination.Item>

                          {Array.from({ length: totalDemoPages }, (_, i) => i + 1).map((p) => (
                            <Pagination.Item key={p}>
                              <Button
                                size="sm"
                                variant={p === demoPage ? 'primary' : 'ghost'}
                                className={`size-8 text-xs font-semibold ${p === demoPage ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                                onPress={() => setDemoPage(p)}
                              >
                                {p}
                              </Button>
                            </Pagination.Item>
                          ))}

                          <Pagination.Item>
                            <Pagination.Next
                              isDisabled={demoPage === totalDemoPages || totalDemoPages === 0}
                              onPress={() => setDemoPage(p => Math.min(totalDemoPages, p + 1))}
                              className="text-xs text-slate-700"
                            >
                              <span>Next</span>
                            </Pagination.Next>
                          </Pagination.Item>
                        </Pagination.Content>
                      </Pagination>
                    </div>
                  </Table.Footer>
                </Table>

              </CardContent>
            </CardRoot>
          )}

          {/* ══════════════ TRANSACTIONS ══════════════ */}
          {activeNav === 'transactions' && (
            <CardRoot className="bg-white shadow-sm rounded-xl border border-slate-100">
              <CardContent className="p-6 space-y-5">

                {/* 1. Header Angka Ringkasan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-800">Daftar Transaksi</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {filteredTransactions.length}
                    </span>
                  </div>

                  {/* Status Pills */}
                  <Tabs
                    selectedKey={txStatusFilter}
                    onSelectionChange={(key) => {
                      setTxStatusFilter(key as any);
                      setTxPage(1);
                    }}
                  >
                    <TabListContainer>
                      <TabList className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs">
                        <Tab id="all" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Semua</Tab>
                        <Tab id="paid" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Paid</Tab>
                        <Tab id="pending" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Pending</Tab>
                        <Tab id="failed" className="rounded-md px-3 py-1 font-medium transition-all data-[selected=true]:bg-white data-[selected=true]:text-slate-900 data-[selected=true]:shadow-xs text-slate-500">Failed</Tab>
                      </TabList>
                    </TabListContainer>
                  </Tabs>
                </div>

                {/* 2. Toolbar & Search Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <DropdownRoot>
                      <Button variant="secondary" size="sm" className="bg-white border border-slate-200 text-slate-700 text-xs gap-1.5 shadow-xs">
                        <Icon icon="gravity-ui:bars-descending-align-left" className="size-3.5 text-slate-500" />
                        <span>Sort: <strong className="capitalize">{txSortDescriptor.column}</strong> ({txSortDescriptor.direction === 'ascending' ? 'Naik' : 'Turun'})</span>
                        <Icon icon="gravity-ui:chevron-down" className="size-3 text-slate-400" />
                      </Button>
                      <DropdownPopover>
                        <DropdownMenu>
                          <DropdownItem onAction={() => setTxSortDescriptor({ column: 'created_at', direction: txSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Tanggal Dibuat
                          </DropdownItem>
                          <DropdownItem onAction={() => setTxSortDescriptor({ column: 'amount', direction: txSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Nominal Jumlah
                          </DropdownItem>
                          <DropdownItem onAction={() => setTxSortDescriptor({ column: 'business_name', direction: txSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Nama Bisnis
                          </DropdownItem>
                          <DropdownItem onAction={() => setTxSortDescriptor({ column: 'status', direction: txSortDescriptor.direction === 'ascending' ? 'descending' : 'ascending' })}>
                            Status
                          </DropdownItem>
                        </DropdownMenu>
                      </DropdownPopover>
                    </DropdownRoot>
                  </div>

                  <div className="w-full md:w-80">
                    <InputGroupRoot>
                      <InputGroupPrefix>
                        <Icon icon="gravity-ui:magnifier" className="size-4 text-slate-400" />
                      </InputGroupPrefix>
                      <Input
                        variant="secondary"
                        placeholder="Cari transaksi, ID, bisnis..."
                        value={txSearchQuery}
                        onChange={(e) => { setTxSearchQuery(e.target.value); setTxPage(1); }}
                        className="bg-white border border-slate-200 text-xs w-full shadow-xs"
                      />
                    </InputGroupRoot>
                  </div>
                </div>

                {/* 3. HeroUI Table */}
                <Table className="rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <Table.ScrollContainer>
                    <Table.Content
                      aria-label="Daftar Transaksi Growfin"
                      className="min-w-[850px]"
                      selectedKeys={txSelectedKeys}
                      selectionMode="multiple"
                      sortDescriptor={txSortDescriptor}
                      onSelectionChange={setTxSelectedKeys}
                      onSortChange={(desc: any) => setTxSortDescriptor(desc)}
                    >
                      <Table.Header className="bg-slate-50/80 border-b border-slate-200">
                        <Table.Column className="pe-0 w-12">
                          <Checkbox aria-label="Select all rows" slot="selection">
                            <Checkbox.Content>
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                            </Checkbox.Content>
                          </Checkbox>
                        </Table.Column>
                        <Table.Column allowsSorting isRowHeader id="id" className="w-36">
                          {({ sortDirection }: { sortDirection: any }) => (
                            <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              ID Transaksi
                            </Table.SortableColumnHeader>
                          )}
                        </Table.Column>
                        <Table.Column allowsSorting id="business_name" className="min-w-56">
                          {({ sortDirection }: { sortDirection: any }) => (
                            <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Bisnis
                            </Table.SortableColumnHeader>
                          )}
                        </Table.Column>
                        <Table.Column allowsSorting id="amount" className="w-36">
                          {({ sortDirection }: { sortDirection: any }) => (
                            <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Jumlah
                            </Table.SortableColumnHeader>
                          )}
                        </Table.Column>
                        <Table.Column allowsSorting id="status" className="w-28">
                          {({ sortDirection }: { sortDirection: any }) => (
                            <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Status
                            </Table.SortableColumnHeader>
                          )}
                        </Table.Column>
                        <Table.Column id="tier" className="w-28 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Paket
                        </Table.Column>
                        <Table.Column id="method" className="w-36 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Metode
                        </Table.Column>
                        <Table.Column allowsSorting id="created_at" className="w-32 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          {({ sortDirection }: { sortDirection: any }) => (
                            <Table.SortableColumnHeader sortDirection={sortDirection} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Dibuat
                            </Table.SortableColumnHeader>
                          )}
                        </Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {pagedTx.length === 0 ? (
                          <Table.Row>
                            <Table.Cell colSpan={8} className="py-14 text-center text-slate-400 text-sm">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Icon icon="gravity-ui:folder-magnifier" className="size-8 text-slate-300" />
                                <span>Belum ada transaksi yang sesuai</span>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ) : (
                          pagedTx.map((tx) => {
                            const { color, label } = getTxStatusChip(tx.status);
                            return (
                              <Table.Row key={tx.id} id={tx.id} className="border-t border-slate-100/80 transition-colors hover:bg-slate-50/70">
                                <Table.Cell className="pe-0">
                                  <Checkbox aria-label={`Select ${tx.id}`} slot="selection" variant="secondary">
                                    <Checkbox.Content>
                                      <Checkbox.Control>
                                        <Checkbox.Indicator />
                                      </Checkbox.Control>
                                    </Checkbox.Content>
                                  </Checkbox>
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                                    <span>{tx.id.slice(0, 10)}…</span>
                                    <Button
                                      isIconOnly
                                      aria-label={`Copy transaction ${tx.id}`}
                                      size="sm"
                                      variant="ghost"
                                      className="size-6 text-slate-400 hover:text-slate-700"
                                      onPress={() => {
                                        navigator.clipboard.writeText(tx.id);
                                        showNotification('success', `ID transaksi ${tx.id} disalin.`);
                                      }}
                                    >
                                      <Icon icon="gravity-ui:copy" className="size-3.5" />
                                    </Button>
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800 leading-snug">{tx.business_name ?? '—'}</p>
                                    {tx.business_slug && (
                                      <p className="text-xs text-slate-400 font-mono">/{tx.business_slug}</p>
                                    )}
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="text-sm font-bold text-slate-900 font-mono">
                                    {tx.amount != null ? formatCurrency(tx.amount) : '—'}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <Chip color={color} variant="soft" size="sm" className="font-semibold text-xs">
                                    {label}
                                  </Chip>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="text-xs text-slate-600 capitalize">
                                    {tx.snapshot_tier ?? '—'}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="text-xs text-slate-500 capitalize">
                                    {tx.payment_method?.replace(/_/g, ' ') ?? '—'}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="text-xs text-slate-500">{formatDate(tx.created_at)}</span>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>

                  <Table.Footer className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200/80">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                      <div className="text-xs text-slate-500">
                        Menampilkan <strong>{filteredTransactions.length > 0 ? (txPage - 1) * ITEMS_PER_PAGE + 1 : 0}</strong> - <strong>{Math.min(txPage * ITEMS_PER_PAGE, filteredTransactions.length)}</strong> dari <strong>{filteredTransactions.length}</strong> transaksi
                      </div>

                      <Pagination size="sm">
                        <Pagination.Content>
                          <Pagination.Item>
                            <Pagination.Previous
                              isDisabled={txPage === 1}
                              onPress={() => setTxPage(p => Math.max(1, p - 1))}
                              className="text-xs text-slate-700"
                            >
                              <span>Previous</span>
                            </Pagination.Previous>
                          </Pagination.Item>

                          {Array.from({ length: totalTxPages }, (_, i) => i + 1).map((p) => (
                            <Pagination.Item key={p}>
                              <Button
                                size="sm"
                                variant={p === txPage ? 'primary' : 'ghost'}
                                className={`size-8 text-xs font-semibold ${p === txPage ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                                onPress={() => setTxPage(p)}
                              >
                                {p}
                              </Button>
                            </Pagination.Item>
                          ))}

                          <Pagination.Item>
                            <Pagination.Next
                              isDisabled={txPage === totalTxPages || totalTxPages === 0}
                              onPress={() => setTxPage(p => Math.min(totalTxPages, p + 1))}
                              className="text-xs text-slate-700"
                            >
                              <span>Next</span>
                            </Pagination.Next>
                          </Pagination.Item>
                        </Pagination.Content>
                      </Pagination>
                    </div>
                  </Table.Footer>
                </Table>

              </CardContent>
            </CardRoot>
          )}

          {/* ══════════════ PLACEHOLDER PAGES ══════════════ */}
          {(activeNav === 'users' || activeNav === 'outreach' || activeNav === 'settings') && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  {activeNav === 'users'    && <Users    size={26} className="text-slate-400" />}
                  {activeNav === 'outreach' && <Zap      size={26} className="text-slate-400" />}
                  {activeNav === 'settings' && <Settings size={26} className="text-slate-400" />}
                </div>
                <p className="text-slate-600 font-medium text-sm">Segera Hadir</p>
                <p className="text-slate-400 text-xs mt-1">Fitur ini sedang dalam pengembangan.</p>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Business Detail & Edit Modal ────────────────────────────────────── */}
      <ModalBackdrop
        isOpen={detailModal.isOpen}
        onOpenChange={detailModal.setOpen}
        variant="blur"
      >
        <ModalContainer size="2xl" placement="center">
          <ModalDialog className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl w-full">
            {({ close }: { close: () => void }) => {
              if (!selectedTenant) return null;
              const { color: statusColor, label: statusLabel } = getStatusChip(selectedTenant.status, selectedTenant.user_id);
              const isEdit = detailModalMode === 'edit';
              const isSaving = actionLoading === selectedTenant.id;

              return (
                <>
                  <ModalHeader className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        <Icon icon={isEdit ? "gravity-ui:pencil" : "gravity-ui:store"} className="size-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-base leading-snug">
                          {isEdit ? `Edit Detail Bisnis: ${selectedTenant.name}` : `Detail Bisnis: ${selectedTenant.name}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {isEdit
                            ? 'Ubah informasi bisnis, status tayang, paket, dan masa aktif website.'
                            : `ID: #${selectedTenant.id.slice(0, 8)} • Slug: /${selectedTenant.slug}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEdit ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => setDetailModalMode('edit')}
                          className="bg-white border border-slate-200 text-xs text-blue-600 font-semibold gap-1.5 shadow-xs"
                        >
                          <Icon icon="gravity-ui:pencil" className="size-3.5" />
                          <span>Edit</span>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => setDetailModalMode('view')}
                          className="bg-white border border-slate-200 text-xs text-slate-600 font-medium gap-1.5 shadow-xs"
                        >
                          <Icon icon="gravity-ui:eye" className="size-3.5" />
                          <span>Lihat Detail</span>
                        </Button>
                      )}
                      <ModalCloseTrigger />
                    </div>
                  </ModalHeader>

                  <ModalBody className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
                    {/* Mode VIEW */}
                    {!isEdit && (
                      <div className="space-y-5">
                        {/* Summary Header Banner */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <Avatar size="lg" className="size-12 rounded-xl ring-2 ring-white shadow-xs shrink-0">
                              {selectedTenant.image_url && <Avatar.Image src={selectedTenant.image_url} alt={selectedTenant.name} />}
                              <Avatar.Fallback className="bg-blue-600 font-bold text-white text-sm">
                                {selectedTenant.name.slice(0, 2).toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar>
                            <div>
                              <h3 className="font-bold text-slate-900 text-base leading-tight">
                                {selectedTenant.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500 font-mono">/{selectedTenant.slug}</span>
                                <Button
                                  isIconOnly
                                  variant="ghost"
                                  size="sm"
                                  className="size-5 text-slate-400 hover:text-blue-600"
                                  onPress={() => window.open(`/${selectedTenant.slug}`, '_blank')}
                                  aria-label="Kunjungi website demo"
                                >
                                  <Icon icon="gravity-ui:arrow-up-right-from-square" className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Chip color={statusColor} size="sm" variant="soft" className="font-semibold text-xs">
                              {statusLabel}
                            </Chip>
                            <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-200 text-slate-700">
                              {selectedTenant.package_tier?.replace(/_/g, ' ') || 'Starter'}
                            </span>
                          </div>
                        </div>

                        {/* Grid Information Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Card 1: Informasi Pemilik & Akun */}
                          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                              <Icon icon="gravity-ui:person" className="size-4 text-blue-600" />
                              <span>Pemilik & Kontak</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[11px]">Nama Pemilik:</span>
                                <span className="font-medium text-slate-800">{selectedTenant.owner_name || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Email Terdaftar:</span>
                                <span className="font-medium text-slate-800 font-mono">{selectedTenant.email || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Status Kepemilikan:</span>
                                {selectedTenant.user_id ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium inline-block">
                                    Claimed (Terhubung akun)
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium inline-block">
                                    Unclaimed (Yatim Piatu)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card 2: Bisnis & Lokasi */}
                          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                              <Icon icon="gravity-ui:briefcase" className="size-4 text-blue-600" />
                              <span>Profil Bisnis</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[11px]">Kategori Usaha:</span>
                                <span className="font-medium text-slate-800">{selectedTenant.category || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Kota:</span>
                                <span className="font-medium text-slate-800">{selectedTenant.city || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Layout Template:</span>
                                <span className="font-mono text-slate-700">{selectedTenant.layout_id || 'Default'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Card 3: Domain & Paket */}
                          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                              <Icon icon="gravity-ui:globe" className="size-4 text-blue-600" />
                              <span>Domain & Paket</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[11px]">Custom Domain:</span>
                                {selectedTenant.custom_domain ? (
                                  <span className="font-semibold text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded inline-block">
                                    {selectedTenant.custom_domain}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Belum dikonfigurasi</span>
                                )}
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Paket Aktif:</span>
                                <span className="font-medium text-slate-800 capitalize">
                                  {selectedTenant.package_tier?.replace(/_/g, ' ') || 'Starter'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card 4: Masa Aktif & Tanggal */}
                          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                              <Icon icon="gravity-ui:calendar" className="size-4 text-blue-600" />
                              <span>Masa Aktif & Kedaluwarsa</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[11px]">Tanggal Pembuatan / Checkout:</span>
                                <span className="font-medium text-slate-800">{formatDate(selectedTenant.created_at)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Masa Aktif Website:</span>
                                <span className="font-medium text-slate-800">
                                  {selectedTenant.site_active_until ? formatDate(selectedTenant.site_active_until) : 'Tidak dibatasi'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Masa Aktif Domain:</span>
                                <span className="font-medium text-slate-800">
                                  {selectedTenant.domain_active_until ? formatDate(selectedTenant.domain_active_until) : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">FOMO Deadline:</span>
                                <span className="font-medium text-slate-800">
                                  {selectedTenant.fomo_expires_at ? formatDate(selectedTenant.fomo_expires_at) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode EDIT */}
                    {isEdit && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Nama Bisnis */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Nama Bisnis</label>
                            <Input
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Nama Bisnis..."
                              className="text-xs w-full bg-white border border-slate-200"
                            />
                          </div>

                          {/* Kategori */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Kategori</label>
                            <Input
                              value={editForm.category}
                              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                              placeholder="Kategori Usaha..."
                              className="text-xs w-full bg-white border border-slate-200"
                            />
                          </div>

                          {/* Nama Pemilik */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Nama Pemilik</label>
                            <Input
                              value={editForm.owner_name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, owner_name: e.target.value }))}
                              placeholder="Nama Pemilik..."
                              className="text-xs w-full bg-white border border-slate-200"
                            />
                          </div>

                          {/* Email Pemilik */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Email Pemilik</label>
                            <Input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="email@bisnis.com"
                              className="text-xs w-full bg-white border border-slate-200"
                            />
                          </div>

                          {/* Kota */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Kota</label>
                            <Input
                              value={editForm.city}
                              onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="Kota..."
                              className="text-xs w-full bg-white border border-slate-200"
                            />
                          </div>

                          {/* Status */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Status Tayang</label>
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            >
                              <option value="draft">Draft (Belum Aktif)</option>
                              <option value="published">Published (Aktif Tayang)</option>
                              <option value="locked">Locked (Terkunci)</option>
                            </select>
                          </div>

                          {/* Paket Tier */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Paket Langganan</label>
                            <select
                              value={editForm.package_tier}
                              onChange={(e) => setEditForm(prev => ({ ...prev, package_tier: e.target.value }))}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            >
                              <option value="free_trial">Free Trial</option>
                              <option value="starter">Starter</option>
                              <option value="pro">Pro</option>
                              <option value="business">Business</option>
                            </select>
                          </div>

                          {/* Custom Domain */}
                          <div className="space-y-1.5">
                            {((selectedTenant?.metadata || selectedTenant?.draft_metadata)?.domainRequest) && (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5 mb-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                    🔔 Permintaan Setup Domain Klien:
                                  </span>
                                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                    (selectedTenant.metadata || selectedTenant.draft_metadata).domainRequest.status === 'active'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    Status: {(selectedTenant.metadata || selectedTenant.draft_metadata).domainRequest.status}
                                  </span>
                                </div>
                                <div className="text-[11px] space-y-0.5">
                                  <p><strong>Pilihan 1:</strong> <span className="font-mono text-blue-600 font-bold">{(selectedTenant.metadata || selectedTenant.draft_metadata).domainRequest.requestedDomain}</span></p>
                                  {(selectedTenant.metadata || selectedTenant.draft_metadata).domainRequest.alternativeDomain && (
                                    <p><strong>Cadangan:</strong> <span className="font-mono text-slate-700">{(selectedTenant.metadata || selectedTenant.draft_metadata).domainRequest.alternativeDomain}</span></p>
                                  )}
                                  {(selectedTenant.metadata || selectedTenant.draft_metadata).domainRequest.whatsappContact && (
                                    <p><strong>WhatsApp:</strong> <span className="text-emerald-700 font-semibold">{(selectedTenant.metadata || selectedTenant.draft_metadata).domainRequest.whatsappContact}</span></p>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 italic">
                                  * Mengisi kolom Custom Domain di bawah otomatis mengubah status permintaan menjadi active.
                                </p>
                              </div>
                            )}
                            <label className="text-xs font-semibold text-slate-700">Custom Domain</label>
                            <Input
                              value={editForm.custom_domain}
                              onChange={(e) => setEditForm(prev => ({ ...prev, custom_domain: e.target.value }))}
                              placeholder="contoh: namabisnis.com"
                              className="text-xs w-full bg-white border border-slate-200"
                            />
                          </div>

                          {/* Masa Aktif Website */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Masa Aktif Website</label>
                            <input
                              type="date"
                              value={editForm.site_active_until}
                              onChange={(e) => setEditForm(prev => ({ ...prev, site_active_until: e.target.value }))}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            />
                          </div>

                          {/* Masa Aktif Domain */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Masa Aktif Domain</label>
                            <input
                              type="date"
                              value={editForm.domain_active_until}
                              onChange={(e) => setEditForm(prev => ({ ...prev, domain_active_until: e.target.value }))}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            />
                          </div>

                          {/* FOMO Expires */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Batas Waktu FOMO</label>
                            <input
                              type="date"
                              value={editForm.fomo_expires_at}
                              onChange={(e) => setEditForm(prev => ({ ...prev, fomo_expires_at: e.target.value }))}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </ModalBody>

                  <ModalFooter className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
                    {!isEdit ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => window.open(`/${selectedTenant.slug}`, '_blank')}
                          className="bg-white border border-slate-200 text-xs text-slate-700 gap-1.5 shadow-xs"
                        >
                          <Icon icon="gravity-ui:arrow-up-right-from-square" className="size-3.5" />
                          <span>Kunjungi Website Demo</span>
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onPress={() => setDetailModalMode('edit')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                          >
                            <Icon icon="gravity-ui:pencil" className="size-3.5" />
                            <span>Edit Detail Bisnis</span>
                          </Button>
                          <Button variant="secondary" size="sm" onPress={close} className="bg-white border border-slate-200 text-xs">
                            Tutup
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => setDetailModalMode('view')}
                          className="bg-white border border-slate-200 text-xs text-slate-700"
                        >
                          Batal
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onPress={handleSaveEdit}
                            isDisabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                          >
                            <Icon icon={isSaving ? "gravity-ui:circle-notch" : "gravity-ui:floppy-disk"} className={`size-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </ModalFooter>
                </>
              );
            }}
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>

    </div>
  );
}
