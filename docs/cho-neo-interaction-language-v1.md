# Chợ Neo Interaction Language v1.0

Loop 1 status: global control inventory only. No active production UI source files should be changed in this loop.

## Inventory Summary

- Controls audited: 79 visible controls or control groups.
- Duplicate action/wording families found: 11.
- Active routes/components audited: Sân Làng, Ông Địa, Quán Tám, local Quán Tám tables, Bàn Màu, Quầy Xã Giao, Khoe Set Đẹp, shared community rooms, Xin Xăm, avatar identity, feedback modal, profile/login touchpoints, world/placeholder routes.
- Highest-risk controls found: report, hide, remove, feedback submit, profile save, content submit, wish/prayer submit.

## Complete Inventory Table

| Room | Current label | Current icon | Action | Frequency | Mobile space cost | Risk | Current clarity | Recommended treatment | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| Sân Làng header | CHỢ NEO | red `市` seal | Brand / home context | high | medium | LOW | clear | unchanged | Brand should teach tone, not become a button unless paired with home behavior. |
| Sân Làng header | Hướng dẫn làng | none | Jump to village guide | medium | medium | LOW | clear | icon plus temporary teaching label | Can become info/map symbol after first-use teaching. |
| Sân Làng header | Chợ đêm / Night Market | custom lantern/market SVG | Mood/status display | high | medium | LOW | moderately clear | unchanged or compact status chip | Not obviously actionable; avoid button styling if no action. |
| Sân Làng header | Đăng nhập / Login | custom user SVG | Navigate to login | medium | medium | MEDIUM | clear | icon plus permanent short label | Login changes identity/session; keep text. |
| Sân Làng header | music note/play + track selector | music note | Toggle music and choose track | high | medium | LOW | clear after recent polish | icon plus compact selector | Keep accessible label and avoid restoring volume clutter. |
| Sân Làng header | Góp ý / Feedback | heart | Open feedback modal | medium | medium | MEDIUM | clear | room-owned icon plus short label | Submission is medium risk; keep `Góp ý` visible. |
| Sân Làng map | Room hotspot labels | emoji room icons from `rooms.ts` | Open room / preview soon room | high | high | LOW/MEDIUM | mixed | room-specific symbol + label | Emoji should be replaced by owned symbols over time. |
| Sân Làng guide | numbered guide rows | emoji room icons | Navigate/open or preview room | medium | high | LOW | clear | unchanged short-term | Good fallback for discoverability. |
| Mobile bottom nav | room items | room icons | Navigate Chợ Neo rooms | high | high | LOW | clear but crowded | icon plus temporary teaching label | Confirm active mobile usage before conversion. |
| Ông Địa | Về Sân Làng / Back to Village | none | Return to village | high | medium | LOW | clear | icon plus temporary teaching label | Prime candidate for compact global Back/Village symbol. |
| Ông Địa | Khấn một điều nhỏ / Small prayer | none | Composer label | high | medium | MEDIUM | clear | room-specific symbol + composer focus | Avoid duplicating in heading, placeholder, and submit area. |
| Ông Địa | Xin vía nhẹ | none | Submit small prayer / blessing request | medium | medium | MEDIUM | clear | room-specific symbol plus permanent short label | Medium risk because it submits text and returns guidance; keep words. |
| Ông Địa | Mở một lộc nhỏ | none | Low-risk blessing/random `lộc` action | medium | medium | LOW/MEDIUM | clear | Ông Địa fan symbol plus teaching label | Must not look like gambling or magic wand. |
| Ông Địa | Qua phòng Xin Xăm | none | Navigate to Xin Xăm | low | medium | LOW | clear | icon plus permanent short label | Ritual adjacency; keep wording for first-time users. |
| Ông Địa | textarea placeholder | none | Prayer input cue | high | high | MEDIUM | warm, but duplicates action | shorten | Composer simplification target. |
| Quán Tám lobby | Về Sân Làng / Village | none | Return to village | high | medium | LOW | clear | global village icon plus teaching label | Same action appears as multiple labels elsewhere. |
| Quán Tám lobby | Chọn avatar / Choose village face | none | Navigate avatar identity | medium | medium | MEDIUM | clear | profile/avatar icon plus short label | Identity-affecting; keep a word. |
| Quán Tám lobby | Table hotspots | table labels | Select table | high | high | LOW | clear | unchanged until room-specific symbols exist | The artwork/hotspot language is part of room identity. |
| Quán Tám mobile | mobile table cards | none | Select table | high | very high | LOW | clear | compact table symbol plus label | Top mobile-space offender. |
| Quán Tám table header | ← Quán Tám | arrow text | Back to table lobby | high | medium | LOW | clear | icon only after teaching | Familiar reversible action. |
| Quán Tám table header | Vào bàn / Take a seat | none | Enter table / seat identity | medium | medium | MEDIUM | clear | icon plus permanent short label | Changes participation state; keep text. |
| Quầy Xã Giao | Đang ngồi / Seated | none | Current seating state | medium | medium | LOW | clear | compact state chip | State, not command, should be visually quieter. |
| Quầy Xã Giao | 🎵 Mở nhạc / Tắt nhạc | emoji music note | Toggle table music | medium | medium | LOW | clear | sound icon only with aria-label | Emoji should be replaced with shared sound symbol. |
| Quầy Xã Giao | ☕ Chào hỏi • Xã giao | emoji cup | Topic note | high | medium | LOW | clear | static tag | Not a control; avoid button styling. |
| Quầy Xã Giao | Posting as avatar | avatar image | Open/change identity | medium | medium | MEDIUM | partly clear | avatar icon plus short label | Needs clear accessible name. |
| Quầy Xã Giao | Use default village face | avatar placeholder | Take seat with default identity | low | medium | MEDIUM | unclear | icon plus permanent short label | Too ambiguous for icon-only. |
| Quầy Xã Giao composer | input placeholder | none | Message text | high | medium | MEDIUM | clear | unchanged | Preserve. |
| Quầy Xã Giao composer | submit button | none | Post note | high | medium | MEDIUM | clear | submit/send symbol plus short label | Posting remains textual until learned. |
| Quầy Xã Giao message | Báo cáo / Report | none | Report content | low | medium | HIGH | clear | words only | Safety/moderation action must stay textual. |
| Quầy Xã Giao host | Ẩn / Hide | none | Hide content | low | low | HIGH | clear | words only | Moderation; do not icon-only. |
| Quầy Xã Giao host | Gỡ / Remove | none | Remove content | low | low | HIGH | clear | words only | Destructive; keep text. |
| Quầy Xã Giao drawer | Đóng / close | none | Close drawer/review | medium | medium | LOW | clear | close icon with aria-label | Familiar reversible action. |
| Quầy Xã Giao host | host key input | none | Unlock review tools | low | medium | HIGH | clear | unchanged | Security/moderation path. |
| Quầy Xã Giao host | Tải / review messages | none | Load moderation queue | low | medium | HIGH | clear | words only | Keep explicit. |
| Quán Tám local tables | Gợi ý mở chuyện / Starter prompts | none | Prompt area label | medium | high | LOW | clear but wordy | collapse into prompt chips | Permanent helper text costs mobile height. |
| Quán Tám local tables | topic prompt chips | small decorative span | Fill composer | high | very high | LOW | clear | room-specific table/cup symbol plus short label | Top offender; can become horizontal scroll or menu. |
| Quán Tám local tables | Góp một câu vào bàn | none | Composer label | high | medium | MEDIUM | clear | shorten | Duplicates submit. |
| Quán Tám local tables | Nói nhẹ. Giữ tên riêng tư. | none | Safety helper | high | medium | MEDIUM | clear | move to collapsible info after first view | Important but permanent height cost. |
| Quán Tám local tables | avatar passport chip / Đổi dáng | avatar | Change avatar | medium | medium | MEDIUM | clear | avatar icon plus tooltip | Keep short label for first-use. |
| Quán Tám local tables | Góp chuyện / Add note | none | Submit local table note | high | medium | MEDIUM | clear | send/table symbol plus short label | Submission should not be icon-only initially. |
| Quán Tám local tables | Còn N ký tự | none | Remaining count | medium | low | LOW | clear | unchanged or hide until near limit | Good conditional behavior. |
| Quán Tám local tables | Nội quy nhẹ | disclosure triangle | Show rules | low | low | MEDIUM | clear | unchanged | Native details works. |
| Quán Tám Bàn Màu | Chọn một màu để mở chuyện | color dot | Topic area label | high | high | LOW | clear but heavy | palette/swatch symbol plus short label | Preserve Bàn Màu identity. |
| Quán Tám Bàn Màu | trend topic chips | color dot | Fill composer | high | very high | LOW | clear | swatch chips; reduce subtitles on mobile | Top offender. |
| Quán Tám Bàn Màu | Góp một màu... | none | Value note | medium | medium | LOW | clear | move to secondary/help | Permanent helper line. |
| Quán Tám Bàn Màu | Thêm tiếng nói của bạn | none | Composer label | high | medium | MEDIUM | clear | shorten | Duplicates submit. |
| Quán Tám Bàn Màu | → | arrow | Submit Bàn Màu note | high | low | MEDIUM | partly clear | send icon plus aria-label and teaching label | Existing arrow is compact but generic. |
| Quán Tám Bàn Màu | Về tất cả bàn | none | Leave selected table | high | medium | LOW | clear | back/table icon plus teaching label | Reversible. |
| Khoe Set | Về Sân Làng | none | Return to village | high | medium | LOW | clear | global village icon plus teaching label | Duplicate global action. |
| Khoe Set | Qua Quán Tám | none | Navigate to Quán Tám | medium | medium | LOW | clear | cup/table symbol plus short label | Room-to-room navigation can be compact. |
| Khoe Set | category row buttons | none | Filter feed category | high | high | LOW | clear | unchanged or segmented control | Works as tabs; consider horizontal scroll. |
| Khoe Set | prompt chips | none | Fill caption prompt | medium | high | LOW | clear | gallery/comment symbol plus horizontal chips | Top offender on mobile. |
| Khoe Set | Chọn ảnh | none | File picker | medium | medium | MEDIUM | clear | icon plus permanent short label | File selection must remain obvious. |
| Khoe Set | Đăng set | none | Submit post | medium | medium | MEDIUM | clear | frame/send symbol plus short label | Posting action; not icon-only. |
| Shared community rooms | Về Sân Làng | none | Return to village | high | medium | LOW | clear | global village icon plus teaching label | Duplicate global action. |
| Shared community rooms | Qua Quán Tám | none | Navigate Quán Tám | medium | medium | LOW | clear | cup/table symbol plus short label | Duplicate room-to-room action. |
| Shared community rooms | prompt buttons | none | Fill note prompt | medium | high | LOW | clear | room-specific prompt symbol, compact chips | Similar to Khoe Set. |
| Shared community rooms | room guardrail chips | none | Safety reminders | high | high | MEDIUM | clear | collapse after first view | Mobile-space offender. |
| Shared community rooms | submit post button | none | Post note | medium | medium | MEDIUM | clear | short label with send icon | Keep textual. |
| Shared community rooms | Tự sửa tiếp | none | Return softened text to composer | low | medium | MEDIUM | clear | words only | Text editing consequence. |
| Shared community rooms | Đăng bản đã dịu | none | Submit softened post | low | medium | MEDIUM | clear | words only | Submission needs text. |
| Xin Xăm | Về Chợ Neo | none | Return to village | high | medium | LOW | clear | global village icon plus teaching label | Label differs from `Về Sân Làng`. |
| Xin Xăm | Qua Ông Địa | none | Navigate to shrine | medium | medium | LOW | clear | shrine/fan symbol plus short label | Ritual adjacency. |
| Xin Xăm | topic buttons | none | Select topic | high | medium | MEDIUM | clear | unchanged segmented control | Choice affects reading; keep words. |
| Xin Xăm | Xin một quẻ nhẹ | holder glow/sticks | Draw stick | medium | medium | MEDIUM | clear | fortune-stick symbol plus permanent short label | Ritual action should be intentional. |
| Xin Xăm | Chạm thẻ xăm / Quẻ NN | rising stick | Reveal reading | medium | medium | MEDIUM | clear | unchanged | Good room-specific symbol. |
| Avatar passport | Về Sân Làng | none | Return to village | high | medium | LOW | clear | global village icon plus teaching label | Duplicate. |
| Avatar passport | Vào Quán Tám | none | Navigate to Quán Tám | high | medium | LOW | clear | cup/table icon plus short label | Duplicate. |
| Avatar passport | mood suggestion chips | none | Fill mood input | medium | high | LOW | clear | compact chips | Top offender if many moods wrap. |
| Avatar passport | Lưu dáng này | none | Save identity | medium | medium | MEDIUM | clear | profile icon plus permanent short label | Identity change; keep text. |
| Avatar passport | avatar tiles | avatar portrait | Select avatar | high | high | MEDIUM | clear | unchanged | Visual choice needs image. |
| Feedback modal | Góp ý / Feedback | heart | Open modal | medium | medium | MEDIUM | clear | heart plus `Góp ý` | Keep visible. |
| Feedback modal | × | close mark | Close modal | medium | low | LOW | clear with aria-label | close icon only | Already acceptable. |
| Feedback modal | scale buttons | none | Answer rating | medium | high | MEDIUM | clear | unchanged | Rating needs visible scale. |
| Feedback modal | option buttons | none | Select answer | medium | high | MEDIUM | clear | unchanged | Keep words. |
| Feedback modal | Gửi góp ý | none | Submit feedback | medium | medium | MEDIUM | clear | words only or send + text | Private submission, keep text. |
| Profile | Save profile submit | none | Save profile | low | medium | MEDIUM | clear | words only or profile + text | Identity data. |
| Login | Send code / verify code / reset | none | Auth flow | low | medium | MEDIUM/HIGH | clear | words only | Auth should remain explicit. |
| World plaza | Enter Forum | none | Navigate Chợ Neo | low | medium | LOW | clear | global village symbol plus label | Legacy route, lower priority. |
| World city placeholders | Back to World / Enter Forum | none | Navigate placeholder pages | low | medium | LOW | clear | unchanged | Low priority. |

## Duplicate Actions and Wording

1. Return to village appears as `Về Sân Làng`, `Về Chợ Neo`, `Back to Village`, `Village`, and `Enter Forum`.
2. Navigate to Quán Tám appears as `Qua Quán Tám`, `Vào Quán Tám`, `Gossip Café`, and table-specific back labels.
3. Back from table appears as `← Quán Tám`, `Về tất cả bàn`, and compact table back controls.
4. Submit table note appears as `Góp chuyện`, `Add note`, `Đặt lên bàn`, `Put it on the table`, and `Góp một câu vào bàn`.
5. Prompt-fill controls appear as `Gợi ý mở chuyện`, `Starter prompts`, `Conversation starters`, prompt chips, and color chips.
6. Avatar/profile action appears as `Chọn avatar`, `Choose village face`, `Đổi dáng`, `Use default village face`, `Chợ Neo Passport`, and `Lưu dáng này`.
7. Music actions use both custom icons and emoji `🎵`; labels vary between `Mở nhạc`, `Tắt nhạc`, and track-selector controls.
8. Safety/helper text repeats near composer labels, placeholders, guardrail strips, and form helper lines.
9. Room icons use emoji/symbol characters in `rooms.ts`, while some controls use custom SVGs.
10. Feedback open and submit both use text-heavy patterns, but close uses icon-only; this is acceptable but needs shared rules.
11. Moderation actions are text-only, which is correct, but host drawer/open/close actions need consistent risk styling.

## Top Ten Mobile-Space Offenders

1. Quán Tám mobile table picker cards with bilingual labels.
2. Quán Tám local table prompt chips with Vietnamese and English subtitles.
3. Bàn Màu topic chips and starter lists.
4. Permanent local table composer safety line plus label plus placeholder plus submit text.
5. Khoe Set prompt strip and category row stacked above composer.
6. Shared community-room guardrail strips.
7. Feedback modal rating and option grids.
8. Avatar mood suggestion chips and large avatar tiles.
9. Sân Làng guide rows plus hotspot labels on small screens.
10. Repeated topbar room navigation pills across Khoe Set, community rooms, Xin Xăm, Avatar, and Ông Địa.

## Controls That Can Become Symbols

- Back / close / return to village.
- Sound on/off and pause motion.
- Focus composer.
- Open avatar/profile.
- Expand/collapse rules.
- Prompt picker entry point.
- Low-risk room-to-room navigation.
- Gallery view/share-like actions, where reversible and familiar.

## Controls That Must Remain Textual

- Delete, remove, hide, ban, report, moderation review.
- Login, verification, profile save.
- Submit post / submit feedback / publish set, at least as icon plus text.
- Ritual topic selection in Xin Xăm.
- Any safety, consent, payment, or irreversible action.

## Proposed Chợ Neo Core Symbol Dictionary

| Symbol | Meaning | Treatment | Teaching behavior | Accessibility | Notes |
|---|---|---|---|---|---|
| Left arrow / doorway-back | Back | icon only after first-use | tooltip on hover/focus | `aria-label="Quay lại"` or context-specific | Keep large touch target. |
| Village gate / small house | Return to Sân Làng | icon plus temporary teaching label | first-use label, tooltip | `aria-label="Về Sân Làng"` | Standardize wording to `Về Sân Làng`. |
| X | Close | icon only | tooltip | `aria-label="Đóng"` | Already used in feedback and host nudge. |
| Magnifier | Search | icon plus label if introduced | tooltip | `aria-label="Tìm kiếm"` | Not common yet. |
| Share arrow | Share | icon plus label first use | tooltip | `aria-label="Chia sẻ"` | Keep out until real share action exists. |
| Gear | Settings | icon plus label | tooltip | `aria-label="Cài đặt"` | Avoid if no settings page. |
| Face/passport | Profile/avatar | icon plus short label | first-use label | `aria-label="Chọn dáng vào chợ"` | Identity-changing; keep a word on mobile. |
| Bell | Notifications | icon plus label if introduced | tooltip | `aria-label="Thông báo"` | Not active yet. |
| Expand corners / chevron | Expand or details | icon only for reversible | tooltip | context-specific label | Native `details` can remain. |
| Speaker / music note | Sound | icon only for low-risk toggles | tooltip | `aria-label="Mở nhạc"` / `Tắt nhạc` | Replace emoji `🎵`. |
| Pause circle | Pause motion | icon plus tooltip | tooltip | `aria-label="Tạm dừng chuyển động"` | Must respect reduced motion. |
| Info circle / guide sign | Help/info | icon plus temporary label | tooltip | `aria-label="Hướng dẫn"` | Good for Village Guide and rules. |
| Pencil / speech bubble focus | Focus composer | icon plus teaching label | first-use label | `aria-label="Góp một câu"` | Should scroll/focus existing composer only. |
| Send arrow / paper plane | Submit/send | icon plus permanent short label for medium risk | none or tooltip | context-specific submit label | Do not icon-only for new users. |
| Trash | Delete | words only or icon plus strong text | confirmation if destructive | `aria-label` plus visible text | Never icon-only. |
| Door/exit | Leave | icon plus short label | tooltip | `aria-label="Rời bàn"` | Reversible context leave can be icon-led. |
| Flag | Report | words only, icon optional | none | `aria-label="Báo cáo"` | High-risk/safety action. |
| Check | Confirm | icon plus text | none | context-specific | Avoid vague check-only for submissions. |
| X / cancel text | Cancel | icon plus text for medium/high risk | tooltip | context-specific | Distinguish close vs cancel. |

## Room-Specific Symbol Dictionary

| Room | Symbol proposal | Meaning | Words appear? | Teaching behavior | Animation behavior | Accessibility label | Cultural ambiguity risk |
|---|---|---|---|---|---|---|---|
| Ông Địa | Praying hands inside soft circle | Khấn một điều nhỏ / focus prayer composer | First use yes; returning users tooltip only | first-use label near control | gentle glow only, reduced-motion static | `Khấn một điều nhỏ` | Low if rendered respectfully, not emoji. |
| Ông Địa | Ông Địa fan | Xin vía nhẹ / request blessing | short label remains | tooltip and first-use label | subtle blessing shimmer if existing flow allows | `Xin vía nhẹ` | Medium; fan must read as shrine-specific, not gambling. |
| Ông Địa | Lộc envelope / small coin bowl | Mở một lộc nhỏ | short label remains | tooltip | single gentle reveal, no casino motion | `Mở một lộc nhỏ` | Medium; avoid lottery/gambling cues. |
| Quán Tám | Teacup / small round table | Quán Tám, table talk, go to café | label first use | tooltip | none or tiny steam if decorative only | `Vào Quán Tám` | Low; café/tea is fitting. |
| Quán Tám | Speech bubble over cup | Focus composer / add a note | short label for submit; icon-only for focus | first-use label | no bounce | `Góp một câu vào bàn` | Low. |
| Quán Tám | Table marker | Choose table | table names remain | none | gentle hover only | table-specific aria label | Low. |
| Bàn Màu | Polish bottle / swatch | Pick color prompt / Bàn Màu | label remains | tooltip | no continuous motion | `Chọn một màu để mở chuyện` | Low. |
| Bàn Màu | Palette/swatch stack | Trend/category filter | label remains | none | none | `Chọn danh mục màu` | Low. |
| Phòng Trưng Bày | Framed nail set | View/show gallery | label remains where posting | tooltip | subtle frame focus only | `Khoe Set Đẹp` | Low. |
| Phòng Trưng Bày | Camera/frame with plus | Add image | permanent short label | none | none | `Chọn ảnh set nail` | Low. |
| Xin Xăm | Fortune-stick container | Xin một quẻ nhẹ | short ritual label remains | tooltip | existing shake, reduced-motion disabled | `Xin một quẻ nhẹ` | Low if not casino-like. |
| Xin Xăm | Scroll/card | Reveal reading | label may appear on first use | tooltip | slow reveal only | `Mở thẻ xăm số N` | Low. |

## Ambiguous Decisions for Review

- Whether the Sân Làng `Chợ đêm / Night Market` card is an action or a status. It looks clickable but is currently a mood/status surface.
- Whether `Góp ý` should become heart-only on desktop. Recommendation: no; feedback submission is medium-risk and benefits from the Vietnamese label.
- Whether Bàn Màu submit arrow can remain icon-only. Recommendation: no for first-time users; add teaching or visible short label.
- Whether avatar identity can be compacted aggressively. Recommendation: not until after Quán Tám pilot confirms users understand passport/dáng language.
- Whether room emoji in `rooms.ts` can survive v1.0. Recommendation: replace with owned SVG/symbols later, but do not rush in Loop 2.
- Whether guardrails can be hidden behind info. Recommendation: only after first-view teaching and only for low-risk reminders; moderation/safety reporting stays visible.

## Loop 1 Self-Review

### Technical Lead

- No active production UI source should change in Loop 1.
- The repo is already dirty with substantial unrelated Chợ Neo work; this loop records that state instead of stashing or rewriting it.
- A backup branch was created at the exact starting HEAD for committed-state rollback.
- Risk: because the worktree is dirty, future implementation loops must stage and review file scope carefully.

### UX Lead

- The largest UX issue is not lack of icons; it is repeated bilingual controls and permanent helper text consuming mobile height.
- The best early wins are global back/village symbols, compact prompt entry points, and composer simplification.
- High-risk and submission actions should remain text-led.

### Accessibility Lead

- Many icon-like or emoji controls need explicit accessible names and consistent focus states.
- Icon-only conversions must use `aria-label`, visible focus rings, and 44x44 touch targets.
- Tooltips must be supplemental, never the accessible name.

### Chợ Neo Design Director

- Current rooms still feel warm and specific, but control language is inconsistent across rooms.
- Emoji symbols are charming in places but too informal for a durable production symbol system.
- The interaction language should emerge from village objects: gate, table, teacup, fan, shrine, swatch, frame, fortune sticks.
- Chợ Neo should not turn into a generic icon dashboard.

Confidence score for Loop 1 audit: 86%.
