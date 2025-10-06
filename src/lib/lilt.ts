import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type Atom = string | number | boolean;
type SExp = Atom | SExp[];

function tokenize(src: string): string[] {
  return src.replace(/\;.*$/gm,"").replace(/\(/g," ( ").replace(/\)/g," ) ").trim().split(/\s+/).filter(Boolean);
}
function parse(tokens: string[]): SExp {
  if (!tokens.length) throw new Error("lilt: empty");
  const t = tokens.shift()!;
  if (t === "(") { const list:SExp[]=[]; while(tokens[0] !== ")"){ if(!tokens.length) throw new Error("lilt: missing ')'"); list.push(parse(tokens)); } tokens.shift(); return list; }
  if (t === ")") throw new Error("lilt: unexpected ')'");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t === "true") return true;
  if (t === "false") return false;
  if (t.startsWith("\"") && t.endsWith("\"")) return t.slice(1,-1);
  return t;
}
export function parseLilt(src: string): SExp { return parse(tokenize(src)); }

type Env = { userId?: string | null; supabase: ReturnType<typeof createServerClient>; };

async function evalForm(form: SExp, env: Env): Promise<any> {
  if (!Array.isArray(form)) return form;
  const [head, ...rest] = form as SExp[]; const sym = String(head);
  if (sym === "and"){ for(const r of rest) if(!(await evalForm(r,env))) return false; return true; }
  if (sym === "or"){ for(const r of rest) if(await evalForm(r,env)) return true; return false; }
  if (sym === "not"){ return !(await evalForm(rest[0],env)); }
  if (sym === "=" || sym === "<" || sym === ">" || sym === "<=" || sym === ">="){
    const [a,b]=await Promise.all(rest.map(r=>evalForm(r,env)));
    if (sym==="=") return a===b; if (sym===">") return a>b; if (sym==="<") return a<b; if (sym===">=") return a>=b; return a<=b;
  }
  if (sym === "is-signed-in") return Boolean(env.userId);
  if (sym === "profiles-count") {
    const { count, error } = await env.supabase.from("profiles").select("id",{ count:"exact", head:true });
    if (error) throw error;
    return count ?? 0;
  }
  throw new Error(`lilt: unknown symbol '${sym}'`);
}
export async function runLilt(src: string, env: Env): Promise<boolean> {
  const ast = parseLilt(src); const result = await evalForm(ast, env); return Boolean(result);
}
export async function makeServerEnv() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string){ return cookieStore.get(name)?.value; },
        set(name: string, value: string, opts: CookieOptions){ cookieStore.set({ name, value, ...opts }); },
        remove(name: string, opts: CookieOptions){ cookieStore.set({ name, value:"", ...opts }); }
      }
    }
  );
  return supabase;
}
