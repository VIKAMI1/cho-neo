#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const loginPath = path.join(repoRoot, "src/app/login/LoginClient.tsx");
const callbackPath = path.join(repoRoot, "src/app/auth/callback/AuthCallbackClient.tsx");
const authDocPath = path.join(repoRoot, "docs/cho-neo/email-otp-auth.md");

const login = fs.readFileSync(loginPath, "utf8");
const callback = fs.readFileSync(callbackPath, "utf8");
const authDoc = fs.readFileSync(authDocPath, "utf8");

test("login requests and verifies a six-digit email OTP code", () => {
  assert.match(login, /supabase\.auth\.signInWithOtp\(\{/);
  assert.match(login, /supabase\.auth\.verifyOtp\(\{/);
  assert.match(login, /type: "email"/);
  assert.match(login, /shouldCreateUser: true/);
  assert.match(login, /Gửi mã/);
  assert.match(login, /Vào Chợ Neo/);
  assert.match(login, /Mã đăng nhập có 6 số/);
  assert.match(login, /maxLength=\{6\}/);
  assert.match(login, /inputMode="numeric"/);
  assert.match(login, /autoComplete="one-time-code"/);
  assert.doesNotMatch(login, /phone|password|newsletter|marketing/i);
});

test("login has resend cooldown, change-email control, and generic OTP errors", () => {
  assert.match(login, /RESEND_COOLDOWN_SECONDS = 60/);
  assert.match(login, /Gửi lại sau \$\{cooldown\}s/);
  assert.match(login, /Gửi lại mã/);
  assert.match(login, /Đổi email/);
  assert.match(login, /Mã không đúng hoặc đã hết hạn/);
  assert.doesNotMatch(login, /error\.message\}/);
});

test("production redirect is not localhost and only localhost dev fallback is kept", () => {
  assert.doesNotMatch(login, /emailRedirectTo|redirectTo|PRODUCTION_AUTH_CALLBACK|LOCAL_AUTH_CALLBACK/);
  assert.doesNotMatch(login, /cho-neo\.vercel\.app|localhost:3000/);
  assert.doesNotMatch(login, /window\.location\.origin\}\/auth\/callback/);
  assert.match(login, /router\.replace\(next\)/);
  assert.match(callback, /router\.replace\(next\.startsWith\("\/"\) \? next : "\/"\)/);
});

test("Supabase dashboard instructions use token-first OTP email", () => {
  assert.match(authDoc, /Mã đăng nhập Chợ Neo/);
  assert.match(authDoc, /Mã đăng nhập của bạn: \{\{ \.Token \}\}/);
  assert.match(authDoc, /Do not use `\{\{ \.ConfirmationURL \}\}`/);
  assert.match(authDoc, /Site URL:[\s\S]*https:\/\/cho-neo\.vercel\.app/);
  assert.match(authDoc, /https:\/\/cho-neo\.vercel\.app\/auth\/callback/);
  assert.match(authDoc, /http:\/\/localhost:3000\/\*\*/);
});
