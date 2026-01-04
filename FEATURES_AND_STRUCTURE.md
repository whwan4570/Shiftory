# Workhaja - 구현된 기능 및 웹 구조

## 📋 구현된 주요 기능

### 1. 인증 및 사용자 관리 (Auth)
- ✅ 사용자 회원가입 (Store 자동 생성 및 OWNER 역할 부여)
- ✅ 로그인 (JWT 기반)
- ✅ 현재 사용자 정보 조회
- ✅ JWT 토큰 인증 미들웨어

### 2. Store 관리 (Stores)
- ✅ Store 생성 (이름, 타임존, 위치, 특수 코드)
- ✅ Store 수정 (이름, 타임존, 위치, 특수 코드, GPS 좌표)
- ✅ Store 목록 조회 (사용자가 멤버인 Store 목록)
- ✅ Store 상세 정보 조회
- ✅ Store 멤버 관리
  - 멤버 초대 (이메일, 역할, 권한)
  - 멤버 목록 조회
  - 멤버 역할 변경

### 3. 권한 관리 (Permissions)
- ✅ 역할 기반 접근 제어 (RBAC)
  - OWNER: 모든 권한
  - MANAGER: 세분화된 권한 (체크박스로 선택)
  - WORKER: 기본 작업 권한
- ✅ MANAGER 권한:
  - `manageSchedule`: 스케줄 관리
  - `manageShifts`: 근무 시간 관리
  - `inviteMembers`: 멤버 초대
  - `approveRequests`: 요청 승인
  - `manageDocuments`: 문서 관리
  - `reviewSubmissions`: 제출 검토
  - `viewReports`: 리포트 조회

### 4. 스케줄 관리 (Scheduling)
- ✅ 월별 스케줄 생성
- ✅ 월별 스케줄 설정 (가용성 마감일, 발행/잠금)
- ✅ 스케줄 발행 (PUBLISHED 상태)
- ✅ 근무 시간(Shift) CRUD
  - 생성 (날짜, 시작/종료 시간, 휴게 시간)
  - 수정
  - 삭제
- ✅ 가용성(Availability) 제출
  - 월별 가용성 제출
  - 날짜별 가용성 설정
- ✅ 이전 월 스케줄 복사 기능
- ✅ 월별/주별 뷰 모드

### 5. 변경 요청 (Change Requests)
- ✅ 변경 요청 생성
  - 근무 시간 변경 (SHIFT_TIME_CHANGE)
  - 근무 취소 요청 (SHIFT_DROP_REQUEST)
  - 근무 대체 요청 (SHIFT_COVER_REQUEST)
  - 근무 교체 요청 (SHIFT_SWAP_REQUEST)
- ✅ 후보자 지원
- ✅ 매니저 승인/거부
- ✅ 승인 시 스케줄 자동 반영 및 알림

### 6. 문서 관리 (Documents)
- ✅ 문서 업로드 및 배포
- ✅ 문서 타입:
  - CONTRACT (계약서)
  - HEALTH_CERTIFICATE (건강 진단서)
  - HYGIENE_TRAINING (위생 교육)
- ✅ 문서 확인(Acknowledgment)
- ✅ 제출물 관리 (제출, 승인/거부, 만료 관리)
- ✅ 만료 예정/만료 문서 표시
- ✅ 누락 제출자 식별

### 7. 알림 (Notifications)
- ✅ 알림 타입:
  - SCHEDULE_PUBLISHED (스케줄 발행)
  - CHANGE_REQUEST_CREATED (변경 요청 생성)
  - CHANGE_REQUEST_APPROVED (변경 요청 승인)
  - CHANGE_REQUEST_REJECTED (변경 요청 거부)
  - CHANGE_REQUEST_UPDATED (변경 요청 업데이트)
  - DOCUMENT_EXPIRING (문서 만료 예정)
  - DOCUMENT_EXPIRED (문서 만료)
  - AVAILABILITY_DEADLINE_APPROACHING (가용성 마감일 임박)
  - SHIFT_REMINDER (근무 알림)
  - TIME_ENTRY_APPROVED (시간 기록 승인)
  - TIME_ENTRY_REJECTED (시간 기록 거부)
- ✅ 알림 목록 조회 (읽음/읽지 않음 필터)
- ✅ 알림 읽음 표시 (개별/전체)

### 8. 시간 기록 (Time Entries)
- ✅ GPS 기반 체크인/체크아웃
  - 위치 검증 (매장 반경 3마일 내)
  - 자동 승인 (위치 검증 성공 시)
  - 수동 검토 (위치 검증 실패 시)
- ✅ 시간 기록 목록 조회
- ✅ 대기 중인 시간 기록 검토 (매니저/오너)
- ✅ 시간 기록 승인/거부
- ✅ 서버 시간 기록 (클라이언트 시간 조작 방지)

### 9. QR 코드 체크인/체크아웃 (TOTP)
- ✅ Rotating QR 코드 생성 (30초 주기)
- ✅ TOTP 토큰 검증
- ✅ QR 코드 표시 페이지 (매니저/오너용)
- ✅ QR 코드 스캔 페이지 (워커용)
- ✅ QR 코드 기반 체크인/체크아웃 (자동 승인)
- ✅ TOTP Secret 리셋 (오너만)

### 10. 리포트 (Reports)
- ✅ 개인 주간/월간 총 근무 시간
- ✅ 개인 초과 근무 시간
- ✅ 직원별 주간/월간 총 근무 시간 (매니저/오너)
- ✅ 직원별 초과 근무 시간 (매니저/오너)
- ✅ 유급/무급 휴게 시간 반영
- ✅ CSV 내보내기

### 11. 시간 요약 (Time Summary)
- ✅ 오늘의 근무 시간
- ✅ 주간/월간 총 근무 시간
- ✅ 초과 근무 시간 (옵션)
- ✅ 사이드바에 표시 (항상 표시)

### 12. 설정 (Settings)
- ✅ 프로필 정보 (읽기 전용)
- ✅ 주 시작일 설정 (월/일)
- ✅ 노동 규칙 설정 (오너만)
  - 일일 초과 근무 규칙 (활성화/비활성화, 기준 시간)
  - 주간 초과 근무 규칙 (활성화/비활성화, 기준 시간)
  - 휴게 시간 규칙 (유급/무급)
  - 가용성 마감일 (일 단위)
- ✅ 체크인 정책 설정 (오너만)
  - 기본 체크인 방식 (QR/GPS)
  - Fallback 허용
  - GPS 반경 설정
  - QR + GPS 동시 요구
  - 시간 창 설정 (체크인/체크아웃)
  - No-shift 체크인 동작
  - 오프라인/권한 거부 동작

---

## 🏗️ 백엔드 구조 (NestJS + Prisma + PostgreSQL)

### 디렉토리 구조

```
workhaja-api/
├── src/
│   ├── admin/              # 관리자 기능
│   │   ├── admin.controller.ts
│   │   └── admin.module.ts
│   │
│   ├── auth/               # 인증
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── decorators/     # 커스텀 데코레이터
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/         # 가드 (인증/권한)
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── permissions.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── strategies/     # Passport 전략
│   │       └── jwt.strategy.ts
│   │
│   ├── change-requests/    # 변경 요청
│   │   ├── change-requests.controller.ts
│   │   ├── change-requests.service.ts
│   │   ├── candidates.controller.ts
│   │   ├── candidates.service.ts
│   │   └── dto/
│   │
│   ├── documents/          # 문서 관리
│   │   ├── documents.controller.ts
│   │   ├── documents.service.ts
│   │   ├── submissions.controller.ts
│   │   └── submissions.service.ts
│   │
│   ├── labor-rules/        # 노동 규칙
│   │   ├── labor-rules.controller.ts
│   │   └── labor-rules.service.ts
│   │
│   ├── notifications/      # 알림
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   └── notifications.processor.ts
│   │
│   ├── prisma/             # Prisma 설정
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── scheduling/         # 스케줄링
│   │   ├── months.controller.ts
│   │   ├── months.service.ts
│   │   ├── shifts.controller.ts
│   │   ├── shifts.service.ts
│   │   ├── availability.controller.ts
│   │   └── availability.service.ts
│   │
│   ├── stores/             # Store 관리
│   │   ├── stores.controller.ts
│   │   ├── stores.service.ts
│   │   ├── interceptors/
│   │   │   └── store-context.interceptor.ts
│   │   └── dto/
│   │
│   ├── time-entries/       # 시간 기록
│   │   ├── time-entries.controller.ts
│   │   ├── time-entries.service.ts
│   │   └── utils/
│   │       └── location.utils.ts
│   │
│   ├── time-summary/       # 시간 요약
│   │   ├── me-summary.controller.ts
│   │   ├── admin-summary.controller.ts
│   │   └── time-summary.service.ts
│   │
│   ├── totp/               # QR 코드 (TOTP)
│   │   ├── totp.controller.ts
│   │   ├── totp.service.ts
│   │   └── dto/
│   │
│   ├── uploads/            # 파일 업로드
│   │   └── uploads.controller.ts
│   │
│   ├── users/              # 사용자
│   │   └── users.service.ts
│   │
│   ├── app.module.ts       # 루트 모듈
│   └── main.ts             # 진입점
│
├── prisma/
│   ├── schema.prisma       # 데이터베이스 스키마
│   └── migrations/         # 마이그레이션 파일
│
└── package.json
```

### 주요 API 엔드포인트

#### 인증 (Auth)
- `POST /auth/register` - 회원가입 (JWT 토큰을 HttpOnly 쿠키로 설정)
- `POST /auth/login` - 로그인 (JWT 토큰을 HttpOnly 쿠키로 설정)
- `POST /auth/logout` - 로그아웃 (쿠키 삭제)
- `GET /auth/me` - 현재 사용자 정보

#### Store 관리
- `GET /stores` - Store 목록
- `GET /stores/:storeId` - Store 상세
- `POST /stores` - Store 생성
- `PUT /stores/:storeId` - Store 수정
- `GET /stores/:storeId/members` - 멤버 목록
- `POST /stores/:storeId/members` - 멤버 초대
- `PUT /stores/:storeId/members/:membershipId` - 멤버 역할 변경

#### 스케줄링
- `GET /stores/:storeId/months` - 월별 스케줄 목록
- `POST /stores/:storeId/months` - 월별 스케줄 생성
- `PUT /stores/:storeId/months/:monthId/publish` - 스케줄 발행
- `POST /stores/:storeId/months/:monthId/copy` - 스케줄 복사
- `GET /stores/:storeId/shifts` - 근무 시간 목록
- `POST /stores/:storeId/shifts` - 근무 시간 생성
- `PUT /stores/:storeId/shifts/:shiftId` - 근무 시간 수정
- `DELETE /stores/:storeId/shifts/:shiftId` - 근무 시간 삭제
- `GET /stores/:storeId/availability` - 가용성 목록
- `POST /stores/:storeId/availability` - 가용성 제출

#### 변경 요청
- `GET /stores/:storeId/requests` - 변경 요청 목록
- `POST /stores/:storeId/requests` - 변경 요청 생성
- `PUT /stores/:storeId/requests/:requestId/approve` - 승인
- `PUT /stores/:storeId/requests/:requestId/reject` - 거부
- `POST /stores/:storeId/requests/:requestId/candidates` - 후보자 지원

#### 문서
- `GET /stores/:storeId/documents` - 문서 목록
- `POST /stores/:storeId/documents` - 문서 생성
- `GET /stores/:storeId/documents/:documentId` - 문서 상세
- `PUT /stores/:storeId/documents/:documentId` - 문서 수정
- `POST /stores/:storeId/documents/:documentId/ack` - 문서 확인
- `POST /stores/:storeId/documents/:documentId/submit` - 문서 제출
- `GET /stores/:storeId/submissions` - 제출물 목록
- `PUT /stores/:storeId/submissions/:submissionId/approve` - 승인
- `PUT /stores/:storeId/submissions/:submissionId/reject` - 거부

#### 알림
- `GET /stores/:storeId/notifications` - 알림 목록
- `PUT /stores/:storeId/notifications/:notificationId/read` - 읽음 표시
- `PUT /stores/:storeId/notifications/read-all` - 전체 읽음 표시

#### 시간 기록
- `POST /stores/:storeId/time-entries` - 체크인/체크아웃
- `GET /stores/:storeId/time-entries` - 시간 기록 목록
- `GET /stores/:storeId/time-entries/pending` - 대기 중인 기록
- `PUT /stores/:storeId/time-entries/:timeEntryId/review` - 승인/거부

#### QR 코드 (TOTP)
- `GET /stores/:storeId/totp/qrcode` - QR 코드 생성
- `POST /stores/:storeId/totp/checkin` - QR 코드로 체크인/아웃
- `POST /stores/:storeId/totp/reset` - TOTP Secret 리셋

#### 리포트
- `GET /stores/:storeId/reports/me/weekly` - 개인 주간 리포트
- `GET /stores/:storeId/reports/me/monthly` - 개인 월간 리포트
- `GET /stores/:storeId/reports/staff/monthly` - 직원 월간 리포트
- `GET /stores/:storeId/reports/users/:userId/monthly` - 특정 사용자 월간 리포트

#### 설정
- `GET /stores/:storeId/labor-rules` - 노동 규칙 조회
- `PUT /stores/:storeId/labor-rules` - 노동 규칙 수정 (체크인 정책 포함)

---

## 🎨 프론트엔드 구조 (Next.js + TypeScript + shadcn/ui)

### 디렉토리 구조

```
staff-scheduling-ui/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지
│   │   ├── login/         # 로그인
│   │   ├── signup/        # 회원가입
│   │   └── join/          # Store 가입
│   │
│   ├── stores/            # Store 관리
│   │   └── page.tsx
│   │
│   ├── schedule/          # 스케줄
│   │   └── page.tsx
│   │
│   ├── checkin/           # 체크인/아웃 (GPS)
│   │   └── page.tsx
│   │
│   ├── qrcode/            # QR 코드 표시 (매니저/오너)
│   │   └── page.tsx
│   │
│   ├── qrscan/            # QR 코드 스캔 (워커)
│   │   └── page.tsx
│   │
│   ├── requests/          # 변경 요청
│   │   └── page.tsx
│   │
│   ├── documents/         # 문서 관리
│   │   └── page.tsx
│   │
│   ├── reports/           # 리포트
│   │   └── page.tsx
│   │
│   ├── notifications/     # 알림
│   │   ├── page.tsx
│   │   └── debug/         # 알림 디버그 (관리자)
│   │
│   ├── settings/          # 설정
│   │   └── page.tsx
│   │
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈 (리다이렉트)
│
├── components/
│   ├── ui/                # shadcn/ui 컴포넌트
│   ├── sidebar.tsx        # 사이드바 네비게이션
│   ├── topbar.tsx         # 상단 바
│   ├── time-summary-card.tsx  # 시간 요약 카드
│   ├── modals/            # 모달 컴포넌트
│   │   ├── create-store-modal.tsx
│   │   ├── edit-store-modal.tsx
│   │   ├── invite-member-modal.tsx
│   │   ├── create-month-modal.tsx
│   │   └── copy-month-modal.tsx
│   └── documents/         # 문서 관련 컴포넌트
│
├── lib/                   # 유틸리티 및 API 클라이언트
│   ├── api.ts             # 메인 API 클라이언트
│   ├── storesApi.ts       # Store API
│   ├── schedulingApi.ts   # 스케줄링 API
│   ├── requestsApi.ts     # 변경 요청 API
│   ├── documentsApi.ts    # 문서 API
│   ├── notificationsApi.ts # 알림 API
│   ├── reportsApi.ts      # 리포트 API
│   ├── timeEntriesApi.ts  # 시간 기록 API
│   ├── totpApi.ts         # TOTP API
│   ├── settingsApi.ts     # 설정 API
│   ├── csvExport.ts       # CSV 내보내기
│   └── types.ts           # 공통 타입
│
├── hooks/
│   └── useAuth.ts         # 인증 훅
│
└── package.json
```

### 주요 페이지 및 경로

| 경로 | 설명 | 접근 권한 |
|------|------|----------|
| `/login` | 로그인 | 공개 |
| `/signup` | 회원가입 | 공개 |
| `/join` | Store 가입 | 공개 |
| `/stores` | Store 목록/관리 | 인증 필요 |
| `/schedule` | 스케줄 조회/관리 | 인증 필요 |
| `/checkin` | GPS 기반 체크인/아웃 | 인증 필요 |
| `/qrcode` | QR 코드 표시 | MANAGER/OWNER |
| `/qrscan` | QR 코드 스캔 | 인증 필요 |
| `/requests` | 변경 요청 | 인증 필요 |
| `/documents` | 문서 관리 | 인증 필요 |
| `/reports` | 리포트 | 인증 필요 |
| `/notifications` | 알림 | 인증 필요 |
| `/settings` | 설정 | 인증 필요 |

### 사이드바 네비게이션

1. **Stores** - Store 관리
2. **Schedule** - 스케줄
3. **Check In/Out** - 체크인/체크아웃
4. **Requests** - 변경 요청
5. **Documents** - 문서 관리
6. **Reports** - 리포트
7. **Notifications** - 알림
8. **Settings** - 설정

---

## 🗄️ 데이터베이스 구조 (PostgreSQL)

### 주요 모델

1. **User** - 사용자
2. **Store** - 매장
3. **Membership** - Store 멤버십 (역할, 권한)
4. **ScheduleMonth** - 월별 스케줄
5. **Shift** - 근무 시간
6. **Availability** - 가용성
7. **ChangeRequest** - 변경 요청
8. **ChangeRequestCandidate** - 변경 요청 후보자
9. **Document** - 문서
10. **DocumentTarget** - 문서 대상
11. **DocumentAck** - 문서 확인
12. **DocumentSubmission** - 문서 제출
13. **TimeEntry** - 시간 기록
14. **Notification** - 알림
15. **NotificationJob** - 알림 작업 큐

### 주요 Enum

- **Role**: OWNER, MANAGER, WORKER
- **MonthStatus**: OPEN, DRAFTING, PUBLISHED
- **ShiftStatus**: DRAFT, PUBLISHED
- **ChangeRequestType**: SHIFT_TIME_CHANGE, SHIFT_DROP_REQUEST, SHIFT_COVER_REQUEST, SHIFT_SWAP_REQUEST
- **ChangeRequestStatus**: PENDING, APPROVED, REJECTED, CANCELED
- **DocumentType**: CONTRACT, HEALTH_CERTIFICATE, HYGIENE_TRAINING
- **SubmissionStatus**: PENDING, APPROVED, REJECTED
- **TimeEntryType**: CHECK_IN, CHECK_OUT
- **TimeEntryStatus**: PENDING_REVIEW, APPROVED, REJECTED
- **NotificationType**: (다양한 알림 타입)

---

## 🔐 보안 및 권한

### 인증
- JWT 기반 인증
- 토큰은 HttpOnly 쿠키에 저장 (XSS 공격 방지)
- Authorization 헤더 fallback 지원 (하위 호환성)
- Helmet 미들웨어로 보안 헤더 설정

### 권한 시스템
1. **OWNER**: 모든 권한
2. **MANAGER**: 선택된 권한만 (체크박스로 선택)
3. **WORKER**: 기본 작업 권한

### Store 컨텍스트
- 모든 Store 관련 요청은 Store ID가 필요
- StoreContextInterceptor가 자동으로 Store 검증
- 사용자는 자신이 멤버인 Store만 접근 가능

---

## 📦 주요 라이브러리

### 백엔드
- **NestJS**: 프레임워크
- **Prisma**: ORM
- **PostgreSQL**: 데이터베이스
- **JWT**: 인증
- **cookie-parser**: 쿠키 파싱 미들웨어
- **helmet**: 보안 헤더 미들웨어
- **bcrypt**: 비밀번호 해싱
- **otplib**: TOTP 생성/검증
- **qrcode**: QR 코드 생성

### 프론트엔드
- **Next.js 16**: 프레임워크 (App Router)
- **React 19**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **shadcn/ui**: UI 컴포넌트
- **Tailwind CSS**: 스타일링
- **date-fns**: 날짜 처리
- **html5-qrcode**: QR 코드 스캔
- **sonner**: 토스트 알림
- **swr**: 데이터 페칭 및 캐싱 (Sidebar Time Summary)

---

## 🚀 배포

### Railway
- **백엔드**: Railway에서 NestJS 앱으로 배포
- **프론트엔드**: Railway에서 Next.js 앱으로 배포
- **데이터베이스**: Railway PostgreSQL

### 환경 변수
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `JWT_SECRET`: JWT 서명 키
- `NEXT_PUBLIC_API_URL`: 프론트엔드에서 사용할 API URL
- `PORT`: 서버 포트 (Railway 자동 할당)

---

## 📝 주요 기능 상세

### 체크인/체크아웃 시스템

1. **GPS 기반**
   - 클라이언트에서 GPS 좌표 수집
   - 서버에서 매장 위치와 거리 계산 (3마일 반경)
   - 검증 성공 시 자동 승인
   - 검증 실패 시 수동 검토 대기

2. **QR 코드 기반 (TOTP)**
   - 매니저/오너가 QR 코드 생성
   - QR 코드에 TOTP 토큰 포함 (30초 유효)
   - 워커가 QR 코드 스캔
   - 토큰 검증 성공 시 자동 승인
   - 위치 검증 불필요

### 알림 시스템
- 비동기 알림 처리 (NotificationJob 큐)
- 실시간 알림 조회
- 읽음/읽지 않음 상태 관리
- 다양한 알림 타입 지원

### 리포트 시스템
- 주간/월간 집계
- 초과 근무 시간 계산
- 휴게 시간 반영
- CSV 내보내기 지원

---

## 🔄 데이터 흐름

1. 사용자 로그인 → JWT 토큰 발급
2. Store 선택 → Store ID localStorage 저장
3. API 요청 → JWT 토큰 + Store ID로 인증/인가
4. StoreContextInterceptor → Store 멤버십 검증
5. Guards → 역할/권한 검증
6. Service → 비즈니스 로직 실행
7. Prisma → 데이터베이스 쿼리
8. 응답 → JSON 데이터 반환

---

## 📚 추가 문서

- `ENVIRONMENT_VARIABLES.md`: 환경 변수 설정 가이드
- `RAILWAY_DEPLOYMENT.md`: Railway 배포 가이드
- 기타 Railway 관련 문서들

