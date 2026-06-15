import axios from "axios";

import { clearStoredTokens, getStoredTokens, persistTokens } from "@/lib/auth";

export function getApiBaseUrl() {
  const internalApiUrl = process.env.NEXT_INTERNAL_API_URL?.trim();
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  // 브라우저에서는 공개 URL을, 서버 컴포넌트/SSR에서는 내부 네트워크 주소를 사용한다.
  if (typeof window === "undefined") {
    return internalApiUrl || "http://backend:8000/api/v1";
  }

  return publicApiUrl || "http://localhost:8000/api/v1";
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl()
});

// 요청 직전에 저장된 access 토큰을 읽어 헤더에 주입한다.
apiClient.interceptors.request.use((config) => {
  const { accessToken } = getStoredTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 401 (토큰 만료) 시 자동으로 refresh 토큰으로 access 토큰을 갱신하고 재시도한다.
// (히어로 섹션 저장 등 admin API 장시간 사용 시 필수)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken } = getStoredTokens();

      if (!refreshToken) {
        clearStoredTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // 이미 refresh 중이면 대기열에 넣고 기다림
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${getApiBaseUrl()}/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access: newAccessToken, refresh: newRefreshToken } = response.data;

        persistTokens(newAccessToken, newRefreshToken || refreshToken);

        // 대기 중이던 요청들 처리
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearStoredTokens();
        // 필요시 로그인 페이지로 이동 (현재는 에러만 전달)
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function extractApiError(error: unknown, fallbackMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    const detail =
      typeof responseData?.detail === "string"
        ? responseData.detail
        : Array.isArray(responseData)
          ? responseData.join(", ")
          : responseData && typeof responseData === "object"
            ? Object.entries(responseData)
                .flatMap(([field, messages]) => {
                  if (Array.isArray(messages)) {
                    return messages.map((message) => `${field}: ${message}`);
                  }
                  if (typeof messages === "string") {
                    return [`${field}: ${messages}`];
                  }
                  return [];
                })
                .join(", ")
            : "";
    return new Error(detail || fallbackMessage);
  }

  return new Error(fallbackMessage);
}

export type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  nickname: string;
  member_type: "buyer" | "seller";
  password: string;
  password_confirm: string;
};

export type PostSummary = {
  id: number;
  title: string;
  author_nickname: string;
  thumbnail_image: string | null;
  board_id?: number;
  board_name?: string;
  board_slug?: string;
  board_type?: string;
  board_product_board_type?: string;
  product_original_price?: string | null;
  product_sale_price?: string | null;
  product_live_url?: string;
  product_store_name?: string;
  product_live_platform?: string;
  product_live_channel?: string;
  product_live_starts_at?: string | null;
  product_live_ends_at?: string | null;
  product_live_status?: ProductLiveStatus | "";
  product_live_benefit?: string;
  product_live_button_label?: string;
  views: number;
  likes: number;
  comment_count: number;
  created_at: string;
};

export type ProductLiveStatus = "scheduled" | "on_air" | "ended" | "replay";

export type BoardWriterRole = "all" | "buyer" | "seller" | "admin";

export type BoardItem = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  board_type: string;
  product_board_type?: "standard" | "live_special";
  audience: "all" | "buyer" | "seller";
  allowed_writer_roles: BoardWriterRole[];
  description: string;
  show_in_top_menu: boolean;
  child_count: number;
  sort_order?: number;
};

export type CommentNode = {
  id: number;
  author: number;
  author_nickname: string;
  content: string;
  is_secret: boolean;
  can_view_secret: boolean;
  parent: number | null;
  created_at: string;
  children: CommentNode[];
};

export type CreateCommentPayload = {
  content: string;
  parent: number | null;
  is_secret?: boolean;
};

export type PostDetail = {
  id: number;
  board: number;
  board_type?: string;
  board_product_board_type?: string;
  author: number;
  author_nickname: string;
  title: string;
  content: string;
  product_original_price?: string | null;
  product_sale_price?: string | null;
  product_live_url?: string;
  product_store_name?: string;
  product_live_platform?: string;
  product_live_channel?: string;
  product_live_starts_at?: string | null;
  product_live_ends_at?: string | null;
  product_live_status?: ProductLiveStatus | "";
  product_live_benefit?: string;
  product_live_button_label?: string;
  views: number;
  likes: number;
  images: { id: number; image: string; created_at: string }[];
  comments: CommentNode[];
  created_at: string;
  updated_at: string;
};

export function resolveMediaUrl(path: string) {
  if (!path) {
    return path;
  }

  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const publicBackendOrigin = publicApiBaseUrl.replace(/\/api\/v1\/?$/, "");
  const internalApiBaseUrl = process.env.NEXT_INTERNAL_API_URL ?? "http://backend:8000/api/v1";
  const internalBackendOrigin = internalApiBaseUrl.replace(/\/api\/v1\/?$/, "");

  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (path.startsWith(internalBackendOrigin)) {
      return `${publicBackendOrigin}${path.slice(internalBackendOrigin.length)}`;
    }
    try {
      const mediaUrl = new URL(path);
      if ((mediaUrl.hostname === "localhost" || mediaUrl.hostname === "127.0.0.1" || mediaUrl.hostname === "34.22.96.236") && mediaUrl.pathname.startsWith("/media/")) {
        // Force correct port for VM (8080 via nginx) or local
        const correctOrigin = mediaUrl.hostname === "34.22.96.236"
          ? "http://34.22.96.236:8080"
          : publicBackendOrigin;
        return `${correctOrigin}${mediaUrl.pathname}${mediaUrl.search}`;
      }
    } catch {
      return path;
    }
    return path;
  }

  // Ensure media paths have /media/ prefix (handles raw storage names like "catalog/home-hero-slides/xx.png"
  // or "/catalog/..." that sometimes come from DB/serializer in hero slides etc.)
  let mediaPath = path;
  if (!mediaPath.includes("/media/")) {
    if (mediaPath.startsWith("/")) {
      mediaPath = "/media" + mediaPath;
    } else {
      mediaPath = "/media/" + mediaPath;
    }
  }

  return `${publicBackendOrigin}${mediaPath}`;
}

export function getProductPlaceholder(type: "hotdeal" | "marketplace", categoryName?: string | null) {
  const normalized = `${categoryName ?? ""}`.toLowerCase();

  if (normalized.includes("디지털") || normalized.includes("노트북") || normalized.includes("tv")) {
    return type === "hotdeal"
      ? "/placeholders/hotdeal-digital.svg"
      : "/placeholders/market-digital.svg";
  }

  if (normalized.includes("스포츠") || normalized.includes("골프")) {
    return type === "hotdeal"
      ? "/placeholders/hotdeal-sports.svg"
      : "/placeholders/market-sports.svg";
  }

  return type === "hotdeal"
    ? "/placeholders/hotdeal-default.svg"
    : "/placeholders/market-default.svg";
}

export type Hotdeal = {
  id: number;
  title: string;
  description: string;
  author: number;
  author_nickname: string;
  category: number | null;
  category_name: string;
  category_slug: string;
  source_url: string;
  live_url: string;
  image?: string | null;
  original_price: string;
  sale_price: string;
  discount_rate: string;
  view_count: number;
  expires_at: string;
  status: string;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketplaceItem = {
  id: number;
  title: string;
  description: string;
  author: number;
  author_nickname: string;
  category: number | null;
  category_name: string;
  category_slug: string;
  product_category: number | null;
  product_category_name: string;
  product_category_slug: string;
  image?: string | null;
  external_image_url?: string | null;
  original_price?: string | null;
  price: string;
  view_count: number;
  region: string;
  menu_placement: "sale" | "used";
  status: string;
  source_mode: "manual" | "imported";
  external_provider: number | null;
  external_provider_name: string;
  external_reference: string;
  external_payload: Record<string, unknown>;
  option_snapshot: Record<string, unknown>;
  is_negotiable: boolean;
  approval_status: "pending" | "approved" | "rejected";
  approval_note: string;
  reviewed_by: number | null;
  reviewed_by_nickname: string;
  reviewed_at: string | null;
  purchase_request_count: number;
  created_at: string;
  updated_at: string;
};

export type NotificationItem = {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  target_url: string;
  is_read: boolean;
  created_at: string;
};

export type Payment = {
  id: number;
  marketplace_item: number | null;
  merchant_uid: string;
  amount: string;
  currency: string;
  provider: string;
  payment_key: string;
  status: string;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type MyPageSummary = {
  user: {
    id: number;
    username: string;
    email: string;
    nickname: string;
    member_type: "buyer" | "seller";
    grade: string;
    operator_role: string;
    points: number;
    profile_image?: string | null;
    is_suspended: boolean;
    suspend_until?: string | null;
    suspend_public?: string;
    suspend_count: number;
    created_at: string;
  };
  stats: {
    total_posts: number;
    total_views: number;
    total_likes: number;
    total_payments: number;
    unread_notifications: number;
  };
  recent_posts: {
    id: number;
    title: string;
    board_name: string;
    board_slug: string;
    views: number;
    likes: number;
    created_at: string;
  }[];
};

export type UnifiedSearchResult = {
  query: string;
  posts: {
    id: number;
    title: string;
    board_slug: string;
    board_name: string;
    author_nickname: string;
    created_at: string;
  }[];
  hotdeals: {
    id: number;
    title: string;
    author_nickname: string;
    discount_rate: string;
    status: string;
    created_at: string;
  }[];
  marketplace: {
    id: number;
    title: string;
    author_nickname: string;
    original_price?: string | null;
    price: string;
    region: string;
    status: string;
    created_at: string;
  }[];
};

export type AdminDashboard = {
  stats: {
    total_users: number;
    suspended_users: number;
    total_boards: number;
    hidden_boards: number;
    total_posts: number;
    blinded_posts: number;
    pending_reports: number;
  };
  recent_admin_logs: {
    id: number;
    action: string;
    target_id: number;
    created_at: string;
    admin_nickname: string;
  }[];
};

export type AdminBoard = {
  id: number;
  name: string;
  slug: string;
  parent?: number | null;
  board_type: string;
  product_board_type?: "standard" | "live_special";
  audience?: "all" | "buyer" | "seller";
  description: string;
  icon: string;
  sort_order: number;
  is_visible: boolean;
  show_in_top_menu?: boolean;
  min_grade: string;
  write_grade: string;
  allowed_writer_roles: BoardWriterRole[];
  comment_grade: string;
  read_permission: string;
  allow_anonymous: boolean;
  allow_anonymous_post: boolean;
  allow_file_upload: boolean;
  use_category: boolean;
  post_count: number;
};

export type AdminMenuCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_visible: boolean;
  menu_placement?: "sale" | "used" | "both" | "hidden";
  created_at: string;
  updated_at: string;
};

export type MarketplaceMenuPlacement = "sale" | "used" | "both" | "hidden";

export type HomeHeroSlide = {
  id: number;
  title: string;
  description: string;
  image: string;
  // 클라우드 admin에서 설정한 실제 저장 경로(GCS object)와 전체 URL (탐색용)
  image_path?: string;
  image_url?: string;
  badge: string;
  href: string;
  sort_order: number;
  display_seconds: number;
  transition_style: "next" | "slide_lr" | "slide_ud" | "fade" | "mosaic" | "zoom" | "rotate" | "flip" | "wipe" | "cinema";
  is_active: boolean;
};

export type AdminMember = {
  id: number;
  username: string;
  email: string;
  nickname: string;
  grade: string;
  operator_role: string;
  points: number;
  is_active: boolean;
  is_suspended: boolean;
  suspend_until: string | null;
  suspend_reason: string;
  suspend_public: string;
  suspend_count: number;
  created_at: string;
  last_login: string | null;
};

export type AdminReport = {
  id: number;
  post: number | null;
  post_title: string;
  comment: number | null;
  comment_content: string;
  reporter: number;
  reporter_nickname: string;
  reason: string;
  detail: string;
  status: string;
  pending_count: number;
  is_emergency: boolean;
  handled_by: number | null;
  handled_by_nickname: string;
  handled_note: string;
  created_at: string;
  handled_at: string | null;
};

export type AdminPost = {
  id: number;
  title: string;
  author_nickname: string;
  board_id: number;
  board_name: string;
  board_slug: string;
  thumbnail_image: string | null;
  is_deleted: boolean;
  is_blinded: boolean;
  is_notice: boolean;
  notice_start: string | null;
  notice_end: string | null;
  views: number;
  likes: number;
  comment_count: number;
  created_at: string;
};

export type AdminKeywordFilter = {
  id: number;
  keyword: string;
  filter_type: string;
  action: string;
  target: string;
  is_active: boolean;
  created_at: string;
};

export type AdminIPBan = {
  id: number;
  ip_address: string;
  reason: string;
  expires_at: string | null;
  created_by: number;
  created_by_nickname: string;
  created_at: string;
};

export type AdminLogItem = {
  id: number;
  action: string;
  target_id: number;
  detail: Record<string, unknown>;
  ip_address: string | null;
  admin_nickname: string;
  created_at: string;
};

export type AdminExternalProvider = {
  id: number;
  name: string;
  code: string;
  provider_type: string;
  base_url: string;
  credentials_hint: string;
  meta: Record<string, unknown>;
  is_active: boolean;
  last_synced_at: string | null;
};

export type CatalogFilterOption = {
  id: number;
  filter: number;
  label: string;
  normalized_value: string;
  color_code: string;
  sort_order: number;
  is_active: boolean;
};

export type CatalogReferenceImage = {
  id: number;
  category: number;
  title: string;
  image: string;
  source_mode: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export type HomeProductSectionSource = "recent_search" | "hotdeal" | "marketplace" | "product_board";

export type HomeProductSectionConfig = {
  id: number;
  title: string;
  description: string;
  source_type: HomeProductSectionSource;
  board?: number | null;
  board_name?: string | null;
  board_slug?: string | null;
  board_type?: string | null;
  board_product_board_type?: "standard" | "live_special" | null;
  category_keyword: string;
  item_limit: number;
  sort_order: number;
  is_active: boolean;
};

export type HomeBoardSectionConfig = {
  id: number;
  title: string;
  board?: number | null;
  board_name?: string | null;
  board_slug?: string | null;
  board_type?: string | null;
  columns: 1 | 2 | 3;
  position: "left" | "center" | "right";
  content_mode: "best" | "recent";
  item_limit: number;
  sort_order: number;
  is_active: boolean;
};

export type SiteDisplaySettings = {
  show_side_category_menu: boolean;
  updated_at: string;
};

export type PopularSearchKeyword = {
  keyword: string;
  search_count: number;
  last_searched_at: string;
};

export type CatalogFilter = {
  id: number;
  category: number;
  name: string;
  slug: string;
  filter_type: string;
  source_mode: string;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
  options: CatalogFilterOption[];
};

export type ExternalCatalogCategory = {
  id: number;
  provider: number;
  provider_name: string;
  external_id: string;
  name: string;
  full_path: string;
  synced_at: string;
};

export type ExternalCatalogAttribute = {
  id: number;
  category: number;
  category_name: string;
  provider_name: string;
  external_key: string;
  name: string;
  created_at: string;
};

export type CatalogCategoryMapping = {
  id: number;
  internal_category: number;
  internal_category_name: string;
  external_category: number;
  external_category_name: string;
  provider_name: string;
  status: string;
  note: string;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
};

export type CatalogFilterMapping = {
  id: number;
  internal_filter: number;
  internal_filter_name: string;
  external_attribute: number;
  external_attribute_name: string;
  provider_name: string;
  status: string;
  note: string;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
};

export type CatalogCategory = {
  id: number;
  parent: number | null;
  parent_name?: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
  filters: CatalogFilter[];
  child_categories: Array<{
    id: number;
    name: string;
    slug: string;
    description: string;
  }>;
  reference_images: CatalogReferenceImage[];
};

export type SubscriptionChannel = {
  id: number;
  channel: string;
  is_enabled: boolean;
  created_at: string;
};

export type ProductAlertSubscription = {
  id: number;
  category: number;
  category_name: string;
  name: string;
  filters: Record<string, unknown>;
  keywords: string[];
  notify_events: string[];
  is_active: boolean;
  last_matched_at: string | null;
  channels: SubscriptionChannel[];
  created_at: string;
  updated_at: string;
};

export type ProductAlertSubscriptionMatchGroup = {
  subscription_id: number;
  match_count: number;
  items: MarketplaceItem[];
};

export type SellerOptionPreset = {
  id: number;
  name: string;
  product_category: number | null;
  product_category_name: string;
  option_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SellerImportPreview = {
  title: string;
  description: string;
  price: string;
  region: string;
  external_image_url: string;
  source_mode: "manual" | "imported";
  external_reference: string;
  external_payload: Record<string, unknown>;
  option_snapshot: Record<string, unknown>;
  product_category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  provider: {
    id: number;
    name: string;
    code: string;
  } | null;
};

export type NotificationPreference = {
  allow_in_app: boolean;
  allow_email: boolean;
  allow_kakao: boolean;
  allow_sms: boolean;
  email: string;
  phone_number: string;
  kakao_target: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
};

export const authApi = {
  async login(payload: LoginPayload) {
    const response = await apiClient.post("/auth/login/", payload);
    return response.data;
  },
  async register(payload: RegisterPayload) {
    const response = await apiClient.post("/auth/register/", payload);
    return response.data;
  },
  async me() {
    const response = await apiClient.get("/auth/me/");
    return response.data;
  },
  async logout() {
    const response = await apiClient.post("/auth/logout/");
    return response.data;
  },
  async mypage(): Promise<MyPageSummary> {
    const response = await apiClient.get("/auth/mypage/");
    return response.data;
  },
  async adminDashboard(): Promise<AdminDashboard> {
    const response = await apiClient.get("/auth/admin/dashboard/");
    return response.data;
  },
  async exportBootstrapSpecs(): Promise<{ specs_code: string }> {
    const response = await apiClient.get("/auth/admin/bootstrap-specs/");
    return response.data;
  },
  async adminMembers(query = ""): Promise<AdminMember[]> {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
    const response = await apiClient.get(`/auth/admin/members/${suffix}`);
    return Array.isArray(response.data) ? response.data : response.data.results ?? [];
  },
  async adminMemberDetail(userId: string): Promise<AdminMember> {
    const response = await apiClient.get(`/auth/admin/members/${userId}/`);
    return response.data;
  },
  async suspendMember(userId: number, payload: {
    is_suspended: boolean;
    suspend_until?: string | null;
    suspend_reason?: string;
    suspend_public?: string;
  }): Promise<AdminMember> {
    const response = await apiClient.patch(`/auth/admin/members/${userId}/suspend/`, payload);
    return response.data;
  },
  async updateMemberGrade(userId: number, payload: { grade: string; reason?: string }): Promise<AdminMember> {
    const response = await apiClient.patch(`/auth/admin/members/${userId}/grade/`, payload);
    return response.data;
  },
  async updateMemberPoints(userId: number, payload: { amount: number; type: "add" | "subtract" | "set"; reason?: string }): Promise<AdminMember> {
    const response = await apiClient.post(`/auth/admin/members/${userId}/points/`, payload);
    return response.data;
  }
};

export type HomeHeroSlidePayload = {
  title: string;
  description?: string;
  image: File;
  badge?: string;
  href?: string;
  sort_order?: number;
  display_seconds?: number;
  transition_style?: "next" | "slide_lr" | "slide_ud" | "fade" | "mosaic" | "zoom" | "rotate" | "flip" | "wipe" | "cinema";
  is_active?: boolean;
};

export async function getBoardPosts(slug: string): Promise<PostSummary[]> {
  const response = await apiClient.get(`/boards/${slug}/posts/`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getBoardDetail(slug: string): Promise<BoardItem> {
  const response = await apiClient.get(`/boards/${slug}/`);
  return response.data;
}

export async function getSiteDisplaySettings(): Promise<SiteDisplaySettings> {
  const response = await apiClient.get("/catalog/site-settings/");
  return response.data;
}

export async function getAdminSiteDisplaySettings(): Promise<SiteDisplaySettings> {
  const response = await apiClient.get("/admin/catalog/site-settings/");
  return response.data;
}

export async function updateAdminSiteDisplaySettings(payload: Partial<SiteDisplaySettings>): Promise<SiteDisplaySettings> {
  const response = await apiClient.patch("/admin/catalog/site-settings/", payload);
  return response.data;
}

export async function getBoards(): Promise<BoardItem[]> {
  const response = await apiClient.get("/boards/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getAdminBoards(): Promise<AdminBoard[]> {
  const response = await apiClient.get("/admin/boards/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminBoard(payload: Omit<AdminBoard, "id" | "slug" | "post_count">): Promise<AdminBoard> {
  const response = await apiClient.post("/admin/boards/", payload);
  return response.data;
}

export async function updateAdminBoard(boardId: number, payload: Partial<Omit<AdminBoard, "id" | "slug" | "post_count">>): Promise<AdminBoard> {
  const response = await apiClient.patch(`/admin/boards/${boardId}/`, payload);
  return response.data;
}

export async function reorderAdminBoards(order: number[]) {
  const response = await apiClient.patch("/admin/boards/reorder/", { order });
  return response.data;
}

export async function toggleAdminBoardVisibility(boardId: number) {
  const response = await apiClient.patch(`/admin/boards/${boardId}/toggle-visibility/`);
  return response.data;
}

export async function deleteAdminBoard(boardId: number, force = false) {
  const suffix = force ? "?force=true" : "";
  return apiClient.delete(`/admin/boards/${boardId}/${suffix}`);
}

// --- Hotdeal Admin ---

export async function getAdminHotdealCategories(): Promise<AdminMenuCategory[]> {
  const response = await apiClient.get("/admin/hotdeal-categories/");
  return response.data;
}

export async function createAdminHotdealCategory(payload: Omit<AdminMenuCategoryPayload, "menu_placement">): Promise<AdminMenuCategory> {
  const response = await apiClient.post("/admin/hotdeal-categories/", payload);
  return response.data;
}

export async function updateAdminHotdealCategory(
  categoryId: number,
  payload: Partial<Omit<AdminMenuCategoryPayload, "menu_placement">>
): Promise<AdminMenuCategory> {
  const response = await apiClient.patch(`/admin/hotdeal-categories/${categoryId}/`, payload);
  return response.data;
}

export async function deleteAdminHotdealCategory(categoryId: number) {
  return apiClient.delete(`/admin/hotdeal-categories/${categoryId}/`);
}

export async function reorderAdminHotdealCategories(order: number[]) {
  const response = await apiClient.patch("/admin/hotdeal-categories/reorder/", { order });
  return response.data;
}

// --- Marketplace Admin ---

export async function getAdminMarketplaceCategories(): Promise<AdminMenuCategory[]> {
  const response = await apiClient.get("/admin/marketplace-categories/");
  return response.data;
}

export async function createAdminMarketplaceCategory(payload: Omit<AdminMenuCategoryPayload, "slug">): Promise<AdminMenuCategory> {
  const response = await apiClient.post("/admin/marketplace-categories/", payload);
  return response.data;
}

export async function updateAdminMarketplaceCategory(
  categoryId: number,
  payload: Partial<Omit<AdminMenuCategoryPayload, "slug">>
): Promise<AdminMenuCategory> {
  const response = await apiClient.patch(`/admin/marketplace-categories/${categoryId}/`, payload);
  return response.data;
}

export async function deleteAdminMarketplaceCategory(categoryId: number) {
  return apiClient.delete(`/admin/marketplace-categories/${categoryId}/`);
}

export async function reorderAdminMarketplaceCategories(order: number[]) {
  const response = await apiClient.patch("/admin/marketplace-categories/reorder/", { order });
  return response.data;
}

export async function getHomeHeroSlides(): Promise<HomeHeroSlide[]> {
  const response = await apiClient.get("/catalog/home-hero-slides/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getAdminHomeHeroSlides(): Promise<HomeHeroSlide[]> {
  const response = await apiClient.get("/admin/catalog/home-hero-slides/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function reorderAdminHomeHeroSlides(order: number[]) {
  const response = await apiClient.patch("/admin/catalog/home-hero-slides/reorder/", { order });
  return response.data;
}

export async function createAdminHomeHeroSlide(payload: HomeHeroSlidePayload): Promise<HomeHeroSlide> {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description ?? "");
  formData.append("image", payload.image);
  formData.append("badge", payload.badge ?? "");
  formData.append("href", payload.href ?? "");
  formData.append("sort_order", String(payload.sort_order ?? 0));
  formData.append("display_seconds", String(payload.display_seconds ?? 3));
  formData.append("transition_style", payload.transition_style ?? "next");
  if (typeof payload.is_active === "boolean") {
    formData.append("is_active", String(payload.is_active));
  }
  const response = await apiClient.post("/admin/catalog/home-hero-slides/", formData);
  return response.data;
}

export async function updateAdminHomeHeroSlide(
  slideId: number,
  payload: Partial<
    Omit<HomeHeroSlidePayload, "image"> & {
      image?: File;
    }
  >
): Promise<HomeHeroSlide> {
  const formData = new FormData();
  if (payload.title !== undefined) {
    formData.append("title", payload.title);
  }
  if (payload.description !== undefined) {
    formData.append("description", payload.description);
  }
  if (payload.badge !== undefined) {
    formData.append("badge", payload.badge);
  }
  if (payload.href !== undefined) {
    formData.append("href", payload.href);
  }
  if (payload.sort_order !== undefined) {
    formData.append("sort_order", String(payload.sort_order));
  }
  if (payload.display_seconds !== undefined) {
    formData.append("display_seconds", String(payload.display_seconds));
  }
  if (payload.transition_style !== undefined) {
    formData.append("transition_style", payload.transition_style);
  }
  if (typeof payload.is_active === "boolean") {
    formData.append("is_active", String(payload.is_active));
  }
  if (payload.image) {
    formData.append("image", payload.image);
  }
  const response = await apiClient.patch(`/admin/catalog/home-hero-slides/${slideId}/`, formData);
  return response.data;
}

export async function deleteAdminHomeHeroSlide(slideId: number) {
  return apiClient.delete(`/admin/catalog/home-hero-slides/${slideId}/`);
}

export async function createReport(payload: {
  post?: number;
  comment?: number;
  reason: string;
  detail?: string;
}) {
  const response = await apiClient.post("/reports/", payload);
  return response.data;
}

export async function getAdminReports(status = "", emergencyOnly = false): Promise<AdminReport[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (emergencyOnly) {
    params.set("emergency", "true");
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get(`/admin/reports/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function handleAdminReport(reportId: number, payload: {
  status: "pending" | "resolved" | "dismissed";
  handled_note?: string;
  blind_target?: boolean;
}): Promise<AdminReport> {
  const response = await apiClient.patch(`/admin/reports/${reportId}/handle/`, payload);
  return response.data;
}

export async function blindAdminPost(postId: number, payload: {
  is_blinded: boolean;
  blind_reason?: string;
}) {
  const response = await apiClient.patch(`/admin/posts/${postId}/blind/`, payload);
  return response.data;
}

export async function noticeAdminPost(postId: number, payload: {
  is_notice: boolean;
  notice_type?: "global" | "board";
  notice_order?: number;
  notice_start?: string | null;
  notice_end?: string | null;
}) {
  const response = await apiClient.patch(`/admin/posts/${postId}/notice/`, payload);
  return response.data;
}

export async function getAdminPosts(boardId?: number): Promise<AdminPost[]> {
  const suffix = boardId ? `?board_id=${boardId}` : "";
  const response = await apiClient.get(`/admin/posts/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function moveAdminPost(postId: number, target_board_id: number) {
  const response = await apiClient.patch(`/admin/posts/${postId}/move/`, { target_board_id });
  return response.data;
}

export async function deleteAdminPost(postId: number, mode: "soft" | "hard") {
  return apiClient.patch(`/admin/posts/${postId}/delete/`, { mode });
}

export async function getAdminKeywordFilters(): Promise<AdminKeywordFilter[]> {
  const response = await apiClient.get("/admin/keywords/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminKeywordFilter(payload: Omit<AdminKeywordFilter, "id" | "created_at">): Promise<AdminKeywordFilter> {
  const response = await apiClient.post("/admin/keywords/", payload);
  return response.data;
}

export async function updateAdminKeywordFilter(keywordId: number, payload: Partial<Omit<AdminKeywordFilter, "id" | "created_at">>): Promise<AdminKeywordFilter> {
  const response = await apiClient.patch(`/admin/keywords/${keywordId}/`, payload);
  return response.data;
}

export async function deleteAdminKeywordFilter(keywordId: number) {
  return apiClient.delete(`/admin/keywords/${keywordId}/`);
}

export async function getAdminIPBans(): Promise<AdminIPBan[]> {
  const response = await apiClient.get("/auth/admin/ip-ban/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminIPBan(payload: {
  ip_address: string;
  reason: string;
  expires_at?: string | null;
}): Promise<AdminIPBan> {
  const response = await apiClient.post("/auth/admin/ip-ban/", payload);
  return response.data;
}

export async function deleteAdminIPBan(banId: number) {
  return apiClient.delete(`/auth/admin/ip-ban/${banId}/`);
}

export async function getAdminLogs(action = ""): Promise<AdminLogItem[]> {
  const suffix = action ? `?action=${encodeURIComponent(action)}` : "";
  const response = await apiClient.get(`/auth/admin/logs/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getAdminCatalogProviders(): Promise<AdminExternalProvider[]> {
  const response = await apiClient.get("/admin/catalog/providers/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getAdminHomeProductSections(): Promise<HomeProductSectionConfig[]> {
  const response = await apiClient.get("/admin/catalog/home-sections/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminHomeProductSection(
  payload: Omit<HomeProductSectionConfig, "id">
): Promise<HomeProductSectionConfig> {
  const response = await apiClient.post("/admin/catalog/home-sections/", payload);
  return response.data;
}

export async function updateAdminHomeProductSection(
  sectionId: number,
  payload: Partial<Omit<HomeProductSectionConfig, "id">>
): Promise<HomeProductSectionConfig> {
  const response = await apiClient.patch(`/admin/catalog/home-sections/${sectionId}/`, payload);
  return response.data;
}

export async function deleteAdminHomeProductSection(sectionId: number) {
  return apiClient.delete(`/admin/catalog/home-sections/${sectionId}/`);
}

export async function getAdminHomeBoardSections(): Promise<HomeBoardSectionConfig[]> {
  const response = await apiClient.get("/admin/catalog/board-sections/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminHomeBoardSection(
  payload: Omit<HomeBoardSectionConfig, "id">
): Promise<HomeBoardSectionConfig> {
  const response = await apiClient.post("/admin/catalog/board-sections/", payload);
  return response.data;
}

export async function updateAdminHomeBoardSection(
  sectionId: number,
  payload: Partial<Omit<HomeBoardSectionConfig, "id">>
): Promise<HomeBoardSectionConfig> {
  const response = await apiClient.patch(`/admin/catalog/board-sections/${sectionId}/`, payload);
  return response.data;
}

export async function deleteAdminHomeBoardSection(sectionId: number) {
  return apiClient.delete(`/admin/catalog/board-sections/${sectionId}/`);
}

export async function getHomeBoardSections(): Promise<HomeBoardSectionConfig[]> {
  const response = await apiClient.get("/catalog/board-sections/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function uploadInlineImage(file: File): Promise<{ url: string; success?: boolean }> {
  const form = new FormData();
  form.append("image", file);
  const response = await apiClient.post("/boards/upload-image/", form);
  return response.data;
}

export async function createAdminCatalogProvider(payload: Omit<AdminExternalProvider, "id" | "last_synced_at">): Promise<AdminExternalProvider> {
  const response = await apiClient.post("/admin/catalog/providers/", payload);
  return response.data;
}

export async function getAdminCatalogCategories(): Promise<CatalogCategory[]> {
  const response = await apiClient.get("/admin/catalog/categories/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminCatalogCategory(payload: {
  parent?: number | null;
  name: string;
  description?: string;
  is_active?: boolean;
  is_visible?: boolean;
  sort_order?: number;
}): Promise<CatalogCategory> {
  const response = await apiClient.post("/admin/catalog/categories/", payload);
  return response.data;
}

export async function updateAdminCatalogCategory(
  categoryId: number,
  payload: Partial<{
    parent: number | null;
    name: string;
    description: string;
    is_active: boolean;
    is_visible: boolean;
    sort_order: number;
  }>
): Promise<CatalogCategory> {
  const response = await apiClient.patch(`/admin/catalog/categories/${categoryId}/`, payload);
  return response.data;
}

export async function deleteAdminCatalogCategory(categoryId: number) {
  return apiClient.delete(`/admin/catalog/categories/${categoryId}/`);
}

export async function getAdminCatalogFilters(categoryId?: number): Promise<CatalogFilter[]> {
  const suffix = categoryId ? `?category_id=${categoryId}` : "";
  const response = await apiClient.get(`/admin/catalog/filters/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminCatalogFilter(payload: {
  category: number;
  name: string;
  filter_type: string;
  source_mode: string;
  is_required?: boolean;
  is_visible?: boolean;
  sort_order?: number;
}): Promise<CatalogFilter> {
  const response = await apiClient.post("/admin/catalog/filters/", payload);
  return response.data;
}

export async function updateAdminCatalogFilter(
  filterId: number,
  payload: Partial<{
    category: number;
    name: string;
    filter_type: string;
    source_mode: string;
    is_required: boolean;
    is_visible: boolean;
    sort_order: number;
  }>
): Promise<CatalogFilter> {
  const response = await apiClient.patch(`/admin/catalog/filters/${filterId}/`, payload);
  return response.data;
}

export async function deleteAdminCatalogFilter(filterId: number) {
  return apiClient.delete(`/admin/catalog/filters/${filterId}/`);
}

export async function createAdminCatalogFilterOption(payload: {
  filter: number;
  label: string;
  normalized_value?: string;
  color_code?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<CatalogFilterOption> {
  const response = await apiClient.post("/admin/catalog/filter-options/", payload);
  return response.data;
}

export async function updateAdminCatalogFilterOption(
  optionId: number,
  payload: Partial<{
    filter: number;
    label: string;
    normalized_value: string;
    color_code: string;
    sort_order: number;
    is_active: boolean;
  }>
): Promise<CatalogFilterOption> {
  const response = await apiClient.patch(`/admin/catalog/filter-options/${optionId}/`, payload);
  return response.data;
}

export async function deleteAdminCatalogFilterOption(optionId: number) {
  return apiClient.delete(`/admin/catalog/filter-options/${optionId}/`);
}

export async function getAdminCatalogFilterOptions(filterId?: number): Promise<CatalogFilterOption[]> {
  const suffix = filterId ? `?filter_id=${filterId}` : "";
  const response = await apiClient.get(`/admin/catalog/filter-options/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getAdminCatalogReferenceImages(categoryId?: number): Promise<CatalogReferenceImage[]> {
  const suffix = categoryId ? `?category_id=${categoryId}` : "";
  const response = await apiClient.get(`/admin/catalog/reference-images/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminCatalogReferenceImage(payload: {
  category: number;
  title: string;
  description?: string;
  source_mode?: string;
  sort_order?: number;
  image: File;
}): Promise<CatalogReferenceImage> {
  const formData = new FormData();
  formData.append("category", String(payload.category));
  formData.append("title", payload.title);
  formData.append("description", payload.description ?? "");
  formData.append("source_mode", payload.source_mode ?? "manual");
  formData.append("sort_order", String(payload.sort_order ?? 0));
  formData.append("image", payload.image);
  const response = await apiClient.post("/admin/catalog/reference-images/", formData);
  return response.data;
}

export async function getAdminExternalCategories(providerId?: number): Promise<ExternalCatalogCategory[]> {
  const suffix = providerId ? `?provider_id=${providerId}` : "";
  const response = await apiClient.get(`/admin/catalog/external-categories/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminExternalCategory(payload: {
  provider: number;
  external_id: string;
  name: string;
  full_path?: string;
}): Promise<ExternalCatalogCategory> {
  const response = await apiClient.post("/admin/catalog/external-categories/", payload);
  return response.data;
}

export async function getAdminExternalAttributes(categoryId?: number): Promise<ExternalCatalogAttribute[]> {
  const suffix = categoryId ? `?category_id=${categoryId}` : "";
  const response = await apiClient.get(`/admin/catalog/external-attributes/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminExternalAttribute(payload: {
  category: number;
  external_key: string;
  name: string;
}): Promise<ExternalCatalogAttribute> {
  const response = await apiClient.post("/admin/catalog/external-attributes/", payload);
  return response.data;
}

export async function getAdminCategoryMappings(): Promise<CatalogCategoryMapping[]> {
  const response = await apiClient.get("/admin/catalog/category-mappings/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminCategoryMapping(payload: {
  internal_category: number;
  external_category: number;
  status?: string;
  note?: string;
}): Promise<CatalogCategoryMapping> {
  const response = await apiClient.post("/admin/catalog/category-mappings/", payload);
  return response.data;
}

export async function getAdminFilterMappings(): Promise<CatalogFilterMapping[]> {
  const response = await apiClient.get("/admin/catalog/filter-mappings/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createAdminFilterMapping(payload: {
  internal_filter: number;
  external_attribute: number;
  status?: string;
  note?: string;
}): Promise<CatalogFilterMapping> {
  const response = await apiClient.post("/admin/catalog/filter-mappings/", payload);
  return response.data;
}

export async function getCatalogCategories(): Promise<CatalogCategory[]> {
  const response = await apiClient.get("/catalog/categories/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getCatalogProviders(): Promise<AdminExternalProvider[]> {
  const response = await apiClient.get("/catalog/providers/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getHomeProductSections(): Promise<HomeProductSectionConfig[]> {
  const response = await apiClient.get("/catalog/home-sections/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getPopularSearchKeywords(limit = 30): Promise<PopularSearchKeyword[]> {
  const response = await apiClient.get(`/search/popular-keywords/?limit=${limit}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getPublicHeroSlides(): Promise<HomeHeroSlide[]> {
  return getHomeHeroSlides();
}

export async function getProductAlertSubscriptions(): Promise<ProductAlertSubscription[]> {
  const response = await apiClient.get("/catalog/subscriptions/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getProductAlertSubscriptionMatches(): Promise<ProductAlertSubscriptionMatchGroup[]> {
  const response = await apiClient.get("/catalog/subscriptions/matches/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createProductAlertSubscription(payload: {
  category: number;
  name: string;
  filters?: Record<string, unknown>;
  keywords?: string[];
  notify_events?: string[];
  channels?: string[];
  is_active?: boolean;
}): Promise<ProductAlertSubscription> {
  const response = await apiClient.post("/catalog/subscriptions/", payload);
  return response.data;
}

export async function updateProductAlertSubscription(
  subscriptionId: number,
  payload: {
    category?: number;
    name?: string;
    filters?: Record<string, unknown>;
    keywords?: string[];
    notify_events?: string[];
    channels?: string[];
    is_active?: boolean;
  }
): Promise<ProductAlertSubscription> {
  const response = await apiClient.patch(`/catalog/subscriptions/${subscriptionId}/`, payload);
  return response.data;
}

export async function deleteProductAlertSubscription(subscriptionId: number) {
  return apiClient.delete(`/catalog/subscriptions/${subscriptionId}/`);
}

export async function getSellerOptionPresets(): Promise<SellerOptionPreset[]> {
  const response = await apiClient.get("/catalog/presets/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createSellerOptionPreset(payload: {
  name: string;
  product_category?: number | null;
  option_snapshot?: Record<string, unknown>;
}): Promise<SellerOptionPreset> {
  const response = await apiClient.post("/catalog/presets/", payload);
  return response.data;
}

export async function deleteSellerOptionPreset(presetId: number) {
  return apiClient.delete(`/catalog/presets/${presetId}/`);
}

export async function getNotificationPreference(): Promise<NotificationPreference> {
  const response = await apiClient.get("/notifications/preferences/");
  return response.data;
}

export async function updateNotificationPreference(payload: Partial<NotificationPreference>): Promise<NotificationPreference> {
  const response = await apiClient.patch("/notifications/preferences/", payload);
  return response.data;
}

export async function getPostDetail(postId: string): Promise<PostDetail> {
  const response = await apiClient.get(`/posts/${postId}/`);
  return response.data;
}

export async function createPost(
  slug: string,
  payload: {
    title: string;
    content: string;
    images?: FileList | null;
    product_original_price?: string;
    product_sale_price?: string;
    product_live_url?: string;
    product_store_name?: string;
    product_live_platform?: string;
    product_live_channel?: string;
    product_live_starts_at?: string;
    product_live_ends_at?: string;
    product_live_status?: ProductLiveStatus | "";
    product_live_benefit?: string;
    product_live_button_label?: string;
    main_ranking_image?: File | null;
  }
) {
  const { accessToken } = getStoredTokens();
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("content", payload.content);
  formData.append("product_original_price", payload.product_original_price ?? "");
  formData.append("product_sale_price", payload.product_sale_price ?? "");
  formData.append("product_live_url", payload.product_live_url ?? "");
  formData.append("product_store_name", payload.product_store_name ?? "");
  formData.append("product_live_platform", payload.product_live_platform ?? "");
  formData.append("product_live_channel", payload.product_live_channel ?? "");
  formData.append("product_live_starts_at", payload.product_live_starts_at ?? "");
  formData.append("product_live_ends_at", payload.product_live_ends_at ?? "");
  formData.append("product_live_status", payload.product_live_status ?? "");
  formData.append("product_live_benefit", payload.product_live_benefit ?? "");
  formData.append("product_live_button_label", payload.product_live_button_label ?? "");
  if (payload.main_ranking_image) {
    formData.append("main_ranking_image", payload.main_ranking_image);
  }

  Array.from(payload.images ?? []).forEach((image) => {
    formData.append("images", image);
  });

  try {
    const response = await apiClient.post(`/boards/${slug}/posts/`, formData, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw extractApiError(error, "게시글 저장에 실패했습니다.");
  }
}

export async function uploadInlinePostImage(image: File): Promise<{ url: string; success: boolean }> {
  const formData = new FormData();
  formData.append("image", image);
  const response = await apiClient.post("/boards/upload-image/", formData);
  return response.data;
}

export async function updatePost(
  postId: string,
  payload: {
    title: string;
    content: string;
    images?: FileList | null;
    removeImageIds?: number[];
    product_original_price?: string;
    product_sale_price?: string;
    product_live_url?: string;
    product_store_name?: string;
    product_live_platform?: string;
    product_live_channel?: string;
    product_live_starts_at?: string;
    product_live_ends_at?: string;
    product_live_status?: ProductLiveStatus | "";
    product_live_benefit?: string;
    product_live_button_label?: string;
  }
) {
  const { accessToken } = getStoredTokens();
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("content", payload.content);
  formData.append("product_original_price", payload.product_original_price ?? "");
  formData.append("product_sale_price", payload.product_sale_price ?? "");
  formData.append("product_live_url", payload.product_live_url ?? "");
  formData.append("product_store_name", payload.product_store_name ?? "");
  formData.append("product_live_platform", payload.product_live_platform ?? "");
  formData.append("product_live_channel", payload.product_live_channel ?? "");
  formData.append("product_live_starts_at", payload.product_live_starts_at ?? "");
  formData.append("product_live_ends_at", payload.product_live_ends_at ?? "");
  formData.append("product_live_status", payload.product_live_status ?? "");
  formData.append("product_live_benefit", payload.product_live_benefit ?? "");
  formData.append("product_live_button_label", payload.product_live_button_label ?? "");
  (payload.removeImageIds ?? []).forEach((imageId) => {
    formData.append("remove_image_ids", String(imageId));
  });

  Array.from(payload.images ?? []).forEach((image) => {
    formData.append("images", image);
  });

  try {
    const response = await apiClient.put(`/posts/${postId}/`, formData, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw extractApiError(error, "게시글 수정에 실패했습니다.");
  }
}

export async function deletePost(postId: number) {
  try {
    await apiClient.delete(`/posts/${postId}/`);
  } catch (error) {
    throw extractApiError(error, "게시글 삭제에 실패했습니다.");
  }
}

export async function likePost(postId: number): Promise<{ likes: number }> {
  const response = await apiClient.post(`/posts/${postId}/like/`);
  return response.data;
}

export async function createComment(postId: number, payload: CreateCommentPayload): Promise<CommentNode> {
  try {
    const response = await apiClient.post(`/posts/${postId}/comments/`, payload);
    return response.data;
  } catch (error) {
    throw extractApiError(error, "댓글 등록에 실패했습니다.");
  }
}

export async function deleteComment(commentId: number) {
  try {
    await apiClient.delete(`/comments/${commentId}/`);
  } catch (error) {
    throw extractApiError(error, "댓글 삭제에 실패했습니다.");
  }
}

export async function getHotdeals(): Promise<Hotdeal[]> {
  const response = await apiClient.get("/hotdeals/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getHotdealCategories(): Promise<AdminMenuCategory[]> {
  const response = await apiClient.get("/hotdeal-categories/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function createHotdeal(payload: {
  title: string;
  description: string;
  source_url: string;
  live_url?: string;
  category?: number | null;
  original_price: string;
  sale_price: string;
  expires_at: string;
  image?: File | null;
}) {
  const { accessToken } = getStoredTokens();
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("source_url", payload.source_url);
  formData.append("live_url", payload.live_url ?? "");
  if (payload.category) {
    formData.append("category", String(payload.category));
  }
  formData.append("original_price", payload.original_price);
  formData.append("sale_price", payload.sale_price);
  formData.append("expires_at", payload.expires_at);
  if (payload.image) {
    formData.append("image", payload.image);
  }
  try {
    const response = await apiClient.post("/hotdeals/", formData, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw extractApiError(error, "핫딜 등록에 실패했습니다.");
  }
}

export async function expireHotdeal(hotdealId: number): Promise<Hotdeal> {
  const { accessToken } = getStoredTokens();
  try {
    const response = await apiClient.patch(
      `/hotdeals/${hotdealId}/expire/`,
      {},
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      }
    );
    return response.data;
  } catch (error) {
    throw extractApiError(error, "핫딜 만료 처리에 실패했습니다.");
  }
}

export async function getMarketplaceItems(): Promise<MarketplaceItem[]> {
  const response = await apiClient.get("/marketplace/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getMyMarketplaceItems(): Promise<MarketplaceItem[]> {
  const response = await apiClient.get("/marketplace/mine/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getAdminMarketplaceItems(approvalStatus?: "pending" | "approved" | "rejected"): Promise<MarketplaceItem[]> {
  const suffix = approvalStatus ? `?approval_status=${encodeURIComponent(approvalStatus)}` : "";
  const response = await apiClient.get(`/admin/marketplace-items/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function updateAdminMarketplaceApproval(
  itemId: number,
  payload: { approval_status: "approved" | "rejected"; approval_note?: string }
): Promise<MarketplaceItem> {
  const response = await apiClient.patch(`/admin/marketplace-items/${itemId}/approval/`, payload);
  return response.data;
}

export async function getMarketplaceCategories(menuPlacement?: MarketplaceMenuPlacement): Promise<AdminMenuCategory[]> {
  const suffix = menuPlacement ? `?menu_placement=${encodeURIComponent(menuPlacement)}` : "";
  const response = await apiClient.get(`/marketplace-categories/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

function buildMarketplaceFormData(payload: {
  title: string;
  description: string;
  category?: number | null;
  product_category?: number | null;
  original_price?: string;
  price: string;
  region: string;
  is_negotiable: boolean;
  source_mode?: "manual" | "imported";
  external_provider?: number | null;
  external_reference?: string;
  external_image_url?: string;
  external_payload?: Record<string, unknown>;
  option_snapshot?: Record<string, unknown>;
  menu_placement?: "sale" | "used";
  image?: File | null;
}) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  if (payload.category) {
    formData.append("category", String(payload.category));
  }
  if (payload.product_category) {
    formData.append("product_category", String(payload.product_category));
  }
  formData.append("original_price", payload.original_price ?? "");
  formData.append("price", payload.price);
  formData.append("region", payload.region);
  formData.append("is_negotiable", String(payload.is_negotiable));
  formData.append("source_mode", payload.source_mode ?? "manual");
  if (payload.external_provider) {
    formData.append("external_provider", String(payload.external_provider));
  }
  if (payload.external_reference) {
    formData.append("external_reference", payload.external_reference);
  }
  if (payload.external_image_url) {
    formData.append("external_image_url", payload.external_image_url);
  }
  if (payload.external_payload) {
    formData.append("external_payload", JSON.stringify(payload.external_payload));
  }
  if (payload.option_snapshot) {
    formData.append("option_snapshot", JSON.stringify(payload.option_snapshot));
  }
  if (payload.menu_placement) {
    formData.append("menu_placement", payload.menu_placement);
  }
  if (payload.image) {
    formData.append("image", payload.image);
  }
  return formData;
}

export async function previewSellerImport(payload: {
  provider?: number | null;
  product_category?: number | null;
  external_reference?: string;
  raw_payload?: string;
}): Promise<SellerImportPreview> {
  try {
    const response = await apiClient.post("/catalog/import-preview/", payload);
    return response.data;
  } catch (error) {
    throw extractApiError(error, "외부 상품 정보를 불러오지 못했습니다.");
  }
}

export async function createMarketplaceItem(payload: {
  title: string;
  description: string;
  category?: number | null;
  product_category?: number | null;
  original_price?: string;
  price: string;
  region: string;
  is_negotiable: boolean;
  source_mode?: "manual" | "imported";
  external_provider?: number | null;
  external_reference?: string;
  external_image_url?: string;
  external_payload?: Record<string, unknown>;
  option_snapshot?: Record<string, unknown>;
  menu_placement?: "sale" | "used";
  image?: File | null;
}) {
  const { accessToken } = getStoredTokens();
  const formData = buildMarketplaceFormData(payload);
  try {
    const response = await apiClient.post("/marketplace/", formData, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw extractApiError(error, "판매글 등록에 실패했습니다.");
  }
}

export async function updateMarketplaceItem(itemId: number, payload: {
  title: string;
  description: string;
  category?: number | null;
  product_category?: number | null;
  original_price?: string;
  price: string;
  region: string;
  is_negotiable: boolean;
  source_mode?: "manual" | "imported";
  external_provider?: number | null;
  external_reference?: string;
  external_image_url?: string;
  external_payload?: Record<string, unknown>;
  option_snapshot?: Record<string, unknown>;
  menu_placement?: "sale" | "used";
  image?: File | null;
}) {
  const { accessToken } = getStoredTokens();
  const formData = buildMarketplaceFormData(payload);
  try {
    const response = await apiClient.patch(`/marketplace/${itemId}/manage/`, formData, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return response.data;
  } catch (error) {
    throw extractApiError(error, "판매 상품 수정에 실패했습니다.");
  }
}

export async function deleteMarketplaceItem(itemId: number) {
  const { accessToken } = getStoredTokens();
  try {
    await apiClient.delete(`/marketplace/${itemId}/manage/`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  } catch (error) {
    throw extractApiError(error, "판매 상품 삭제에 실패했습니다.");
  }
}

export async function updateMarketplaceStatus(itemId: number, status: string): Promise<MarketplaceItem> {
  const { accessToken } = getStoredTokens();
  try {
    const response = await apiClient.patch(
      `/marketplace/${itemId}/status/`,
      { status },
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      }
    );
    return response.data;
  } catch (error) {
    throw extractApiError(error, "거래 상태 변경에 실패했습니다.");
  }
}

export async function purchaseMarketplaceItem(itemId: number, message: string) {
  const { accessToken } = getStoredTokens();
  try {
    const response = await apiClient.post(
      `/marketplace/${itemId}/purchase/`,
      { message },
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      }
    );
    return response.data;
  } catch (error) {
    throw extractApiError(error, "구매 요청에 실패했습니다.");
  }
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const response = await apiClient.get("/notifications/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function markNotificationAsRead(notificationId: number): Promise<NotificationItem> {
  const response = await apiClient.patch(`/notifications/${notificationId}/read/`);
  return response.data;
}

export async function preparePayment(payload: {
  marketplace_item_id?: number;
  amount?: string;
  buyer_name: string;
  buyer_email: string;
}): Promise<{
  payment: Payment;
  portone: {
    merchant_uid: string;
    amount: string;
    buyer_name: string;
    buyer_email: string;
  };
}> {
  const response = await apiClient.post("/payments/prepare/", payload);
  return response.data;
}

export async function verifyPayment(payload: {
  merchant_uid: string;
  payment_key: string;
  status: string;
}): Promise<Payment> {
  const response = await apiClient.post("/payments/verify/", payload);
  return response.data;
}

export async function getPayments(): Promise<Payment[]> {
  const response = await apiClient.get("/payments/");
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getHotdealDetail(hotdealId: string): Promise<Hotdeal> {
  const response = await apiClient.get(`/hotdeals/${hotdealId}/`);
  return response.data;
}

export async function getMarketplaceDetail(itemId: string): Promise<MarketplaceItem> {
  const response = await apiClient.get(`/marketplace/${itemId}/`);
  return response.data;
}

export async function getHotdealsByCategory(categorySlug?: string): Promise<Hotdeal[]> {
  const suffix = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : "";
  const response = await apiClient.get(`/hotdeals/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function getMarketplaceItemsByCategory(
  categorySlug?: string,
  menuPlacement?: "sale" | "used"
): Promise<MarketplaceItem[]> {
  const query = new URLSearchParams();
  if (categorySlug) {
    query.set("category", categorySlug);
  }
  if (menuPlacement) {
    query.set("menu_placement", menuPlacement);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiClient.get(`/marketplace/${suffix}`);
  return Array.isArray(response.data) ? response.data : response.data.results ?? [];
}

export async function unifiedSearch(query: string): Promise<UnifiedSearchResult> {
  const response = await apiClient.get(`/search/?q=${encodeURIComponent(query)}`);
  return response.data;
}
export type AdminMenuCategoryPayload = {
  name: string;
  description: string;
  sort_order: number;
  is_visible: boolean;
  menu_placement?: NonNullable<AdminMenuCategory["menu_placement"]>;
};
