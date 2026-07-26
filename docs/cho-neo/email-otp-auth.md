# Chợ Neo Email OTP Auth

Chợ Neo production login uses a six-digit email OTP code. The visitor should not
need to click a magic link.

## Supabase Email Template

Update the Magic Link / OTP email template so the visitor-facing login action is
the token, not the confirmation URL.

Subject:

```text
Mã đăng nhập Chợ Neo
```

Body:

```text
Mã đăng nhập của bạn: {{ .Token }}
Mã này chỉ dùng một lần và sẽ hết hạn sớm.
```

Do not use `{{ .ConfirmationURL }}` as the primary Chợ Neo login action.

## Supabase URL Configuration

Site URL:

```text
https://cho-neo.vercel.app
```

Additional redirect URLs:

```text
https://cho-neo.vercel.app/auth/callback
http://localhost:3000/**
```

The repository currently uses `/auth/callback` for legacy magic-link, invite, and
callback handling. The OTP code flow verifies directly on `/login`.
