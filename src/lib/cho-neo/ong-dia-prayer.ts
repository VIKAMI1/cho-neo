export type OngDiaWishCategory =
  | "vague_blessing"
  | "shop_business"
  | "money_debt"
  | "gambling"
  | "gambling_debt"
  | "family_relationship"
  | "burnout_stress"
  | "severe_burnout_despair"
  | "grief_loss"
  | "abuse_threat_unsafe"
  | "domestic_violence"
  | "coercion_blackmail"
  | "child_elder_safety"
  | "sexual_exploitation"
  | "self_harm"
  | "medical_emergency"
  | "legal_trouble"
  | "legal_danger"
  | "severe_debt_crisis"
  | "substance_addiction"
  | "delusional_paranoid_fear"
  | "guaranteed_spiritual_answer"
  | "sexual_inappropriate"
  | "curse_harm_request"
  | "trolling_spam_nonsense"
  | "unknown";

export type OngDiaWishSeverity = "low" | "medium" | "high";

export type OngDiaPrayerResponse = {
  noticedDetail?: string;
  loiOngDia: string;
  ongNhacNhe?: string;
  viecNhoHomNay?: string;
  khiChuyenQuaNang?: string;
};

export type OngDiaWishRoute = {
  category: OngDiaWishCategory;
  severity: OngDiaWishSeverity;
};

const EMPTY_OR_VAGUE = [
  "xin via",
  "xin vía",
  "xin vía nhẹ",
  "xin via nhe",
  "cau may",
  "cầu may",
  "blessing",
  "may man",
  "may mắn",
];

const CATEGORY_KEYWORDS: Record<OngDiaWishCategory, string[]> = {
  vague_blessing: EMPTY_OR_VAGUE,
  shop_business: [
    "business",
    "client",
    "khach",
    "khách",
    "khong co khach",
    "ít khách",
    "it khach",
    "salon",
    "slow",
    "tiem",
    "tiệm",
    "vắng",
    "vang",
  ],
  money_debt: [
    "bill",
    "debt",
    "hoa don",
    "hóa đơn",
    "money",
    "mượn tiền",
    "muon tien",
    "chứng khoán",
    "chung khoan",
    "stock",
    "lỗ",
    "lo",
    "mất tiền",
    "mat tien",
    "thua stock",
    "lottery",
    "nợ",
    "no",
    "rent",
    "tiền",
    "tien",
    "trả nợ",
    "tra no",
    "trúng số",
    "trung so",
    "vé số",
    "ve so",
  ],
  gambling: ["bet", "cờ bạc", "co bac", "gambling", "casino", "đánh bài", "danh bai"],
  gambling_debt: [
    "cờ bạc nợ",
    "co bac no",
    "cờ bạc thiếu nợ",
    "co bac thieu no",
    "gambling debt",
    "nợ cờ bạc",
    "no co bac",
    "thua bài",
    "thua bai",
  ],
  family_relationship: [
    "bạn trai",
    "ban trai",
    "chồng",
    "chong",
    "family",
    "gia dinh",
    "gia đình",
    "người yêu",
    "nguoi yeu",
    "relationship",
    "vợ",
    "vo",
  ],
  burnout_stress: [
    "áp lực",
    "ap luc",
    "burnout",
    "chán",
    "chan",
    "đuối",
    "duoi",
    "không muốn làm",
    "khong muon lam",
    "mệt",
    "met",
    "stress",
  ],
  severe_burnout_despair: [
    "biến mất luôn",
    "bien mat luon",
    "không còn lý do sống",
    "khong con ly do song",
    "kết thúc cuộc đời",
    "ket thuc cuoc doi",
  ],
  grief_loss: [
    "đám tang",
    "dam tang",
    "grief",
    "mat me",
    "mất mẹ",
    "mất ba",
    "mat ba",
    "mất người",
    "mat nguoi",
    "qua đời",
    "qua doi",
  ],
  abuse_threat_unsafe: [
    "abuse",
    "bạo hành",
    "bao hanh",
    "bị đánh",
    "bi danh",
    "đe dọa",
    "de doa",
    "dọa đánh",
    "doa danh",
    "không an toàn",
    "khong an toan",
    "threat",
  ],
  domestic_violence: [
    "chồng đánh",
    "chong danh",
    "chồng dọa đánh",
    "chong doa danh",
    "vợ đánh",
    "vo danh",
    "người yêu đánh",
    "nguoi yeu danh",
    "bạn trai đánh",
    "ban trai danh",
    "bị chồng dọa",
    "bi chong doa",
    "domestic violence",
  ],
  coercion_blackmail: [
    "blackmail",
    "bị ép",
    "bi ep",
    "bị tống tiền",
    "bi tong tien",
    "đe dọa tung",
    "de doa tung",
    "ép gửi",
    "ep gui",
    "ép làm",
    "ep lam",
    "tống tiền",
    "tong tien",
    "uy hiếp",
    "uy hiep",
  ],
  child_elder_safety: [
    "con nít bị",
    "con nit bi",
    "em bé bị",
    "em be bi",
    "người già bị",
    "nguoi gia bi",
    "trẻ em bị",
    "tre em bi",
    "elder abuse",
    "child abuse",
  ],
  sexual_exploitation: [
    "ép gửi hình",
    "ep gui hinh",
    "hình nhạy cảm",
    "hinh nhay cam",
    "ảnh nhạy cảm",
    "anh nhay cam",
    "clip riêng tư",
    "clip rieng tu",
    "tống tiền bằng hình",
    "tong tien bang hinh",
    "sexual exploitation",
    "revenge porn",
  ],
  self_harm: [
    "biến mất luôn",
    "bien mat luon",
    "cắt tay",
    "cat tay",
    "chết cho rồi",
    "chet cho roi",
    "kết thúc cuộc đời",
    "ket thuc cuoc doi",
    "không còn lý do sống",
    "khong con ly do song",
    "không muốn sống",
    "khong muon song",
    "làm đau mình",
    "lam dau minh",
    "muốn chết",
    "muon chet",
    "nhảy lầu",
    "nhay lau",
    "suicide",
    "treo cổ",
    "treo co",
    "tự tử",
    "tu tu",
    "uống thuốc",
    "uong thuoc",
  ],
  medical_emergency: [
    "cấp cứu",
    "cap cuu",
    "chảy máu",
    "chay mau",
    "đau ngực",
    "dau nguc",
    "khó thở",
    "kho tho",
    "medical emergency",
    "ngất",
    "ngat",
  ],
  legal_trouble: [
    "bị kiện",
    "bi kien",
    "công an",
    "cong an",
    "court",
    "kiện",
    "kien",
    "legal",
    "luật",
    "luat",
    "tòa",
    "toa",
  ],
  legal_danger: [
    "bắt giữ",
    "bat giu",
    "bị bắt",
    "bi bat",
    "bị cưỡng chế",
    "bi cuong che",
    "trát tòa",
    "trat toa",
    "warrant",
    "deport",
    "trục xuất",
    "truc xuat",
  ],
  severe_debt_crisis: [
    "bể nợ",
    "be no",
    "không biết sống sao",
    "khong biet song sao",
    "nợ nhiều quá",
    "no nhieu qua",
    "vỡ nợ",
    "vo no",
    "debt crisis",
  ],
  substance_addiction: [
    "addiction",
    "nghiện",
    "nghien",
    "rượu",
    "ruou",
    "ma túy",
    "ma tuy",
    "thuốc phiện",
    "thuoc phien",
    "cai nghiện",
    "cai nghien",
  ],
  delusional_paranoid_fear: [
    "bị theo dõi",
    "bi theo doi",
    "có người ám",
    "co nguoi am",
    "ma ám",
    "ma am",
    "người ta hại con",
    "nguoi ta hai con",
    "paranoid",
    "theo dõi con",
    "theo doi con",
  ],
  guaranteed_spiritual_answer: [
    "chắc chắn",
    "chac chan",
    "số con",
    "so con",
    "số phận",
    "so phan",
    "xui suốt đời",
    "xui suot doi",
    "trúng số đi",
    "trung so di",
    "bảo đảm",
    "bao dam",
    "định mệnh",
    "dinh menh",
  ],
  sexual_inappropriate: [
    "18+",
    "chuyện người lớn",
    "chuyen nguoi lon",
    "dâm",
    "dam",
    "dirty",
    "không đứng đắn",
    "khong dung dan",
    "nhạy cảm",
    "nhay cam",
    "nude",
    "sex",
    "sexual",
    "tình dục",
    "tinh duc",
    "tục",
    "tuc",
    "xxx",
    "khiêu dâm",
    "khieu dam",
  ],
  curse_harm_request: [
    "curse",
    "hại nó",
    "hai no",
    "nguyền",
    "nguyen",
    "rủa",
    "rua",
    "trả thù",
    "tra thu",
  ],
  trolling_spam_nonsense: [
    "asdf",
    "haha",
    "lol",
    "spam",
    "test",
    "zzz",
  ],
  unknown: [],
};

const SERIOUS_CATEGORIES = new Set<OngDiaWishCategory>([
  "gambling_debt",
  "abuse_threat_unsafe",
  "domestic_violence",
  "coercion_blackmail",
  "child_elder_safety",
  "sexual_exploitation",
  "self_harm",
  "medical_emergency",
  "legal_trouble",
  "legal_danger",
  "severe_debt_crisis",
  "substance_addiction",
  "severe_burnout_despair",
  "curse_harm_request",
]);

const DETERMINISTIC_SAFETY_LINES: Partial<Record<OngDiaWishCategory, string>> = {
  self_harm:
    "Nếu con có thể làm đau mình ngay lúc này, gọi hỗ trợ khẩn cấp nơi con ở hoặc đi tới chỗ có người ngay. Đừng ngồi một mình với ý nghĩ đó.",
  abuse_threat_unsafe:
    "Nếu nguy hiểm đang ở trước mặt, rời tới chỗ an toàn và gọi hỗ trợ khẩn cấp nơi con ở.",
  domestic_violence:
    "Nếu nguy hiểm đang ở trước mặt, rời tới chỗ an toàn và gọi hỗ trợ khẩn cấp nơi con ở.",
  medical_emergency:
    "Nếu có dấu hiệu nguy hiểm cho thân thể, đi cấp cứu hoặc gọi hỗ trợ y tế ngay.",
  gambling_debt:
    "Dừng chuyện gỡ trước. Nói với một người đáng tin và giữ giấy tờ, tiền nhà trước.",
  severe_debt_crisis:
    "Dừng ký thêm điều gì mới trong lúc rối. Nói với một người đáng tin và giữ giấy tờ, tiền nhà trước.",
  coercion_blackmail:
    "Nếu con bị ép, bị dọa, hoặc bị giữ hình ảnh riêng tư, nói với người đáng tin và tìm chỗ hỗ trợ an toàn gần mình.",
  sexual_exploitation:
    "Nếu con bị ép, bị dọa, hoặc bị giữ hình ảnh riêng tư, nói với người đáng tin và tìm chỗ hỗ trợ an toàn gần mình.",
  child_elder_safety:
    "Nếu trẻ nhỏ, người già, hoặc người yếu thế đang không an toàn, báo cho người đáng tin và tìm hỗ trợ khẩn cấp nơi con ở.",
  legal_trouble:
    "Nếu có bắt buộc, đe dọa, hoặc nguy cơ mất an toàn, tìm hỗ trợ pháp lý hay khẩn cấp tại địa phương.",
  legal_danger:
    "Nếu có bắt buộc, đe dọa, hoặc nguy cơ mất an toàn, tìm hỗ trợ pháp lý hay khẩn cấp tại địa phương.",
  substance_addiction:
    "Nếu chuyện nghiện làm con hoặc người nhà không an toàn, nói với người đáng tin và tìm chỗ hỗ trợ gần mình.",
  severe_burnout_despair:
    "Nếu con thấy mình không an toàn một mình, gọi hoặc nhắn ngay cho người đáng tin và đi tới chỗ có người.",
  curse_harm_request:
    "Ông không giúp hại người. Rời khỏi chuyện nóng trước, giữ thân mình và đừng làm việc khiến con mất thêm bình an.",
  delusional_paranoid_fear:
    "Nếu nỗi sợ làm con thấy không an toàn hoặc không ngủ nghỉ được, nói với người đáng tin và tìm chỗ hỗ trợ gần mình.",
};

const BOUNDARY_NUDGES: Partial<Record<OngDiaWishCategory, string>> = {
  guaranteed_spiritual_answer:
    "Ông không khóa số phận của con bằng một lời. Chuyện đời còn đường đổi khi mình biết dừng, biết giữ, biết bước lại.",
};

function normalizePrayerText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAnyKeyword(source: string, keywords: string[]) {
  return keywords.some((keyword) => hasKeywordMatch(source, keyword));
}

function hasKeywordMatch(source: string, keyword: string) {
  const normalizedKeyword = normalizePrayerText(keyword);
  const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`).test(source);
}

function categoryHasMatch(original: string, normalized: string, category: OngDiaWishCategory) {
  return matchesCategory(original, normalized, category);
}

export function detectImmediateRisk(prayer: string): OngDiaWishRoute | null {
  const trimmedPrayer = prayer.trim();
  if (!trimmedPrayer) return null;

  const original = trimmedPrayer.toLowerCase();
  const normalized = normalizePrayerText(trimmedPrayer);
  const has = (category: OngDiaWishCategory) =>
    categoryHasMatch(original, normalized, category);

  if (has("self_harm")) return { category: "self_harm", severity: "high" };
  if (has("medical_emergency")) return { category: "medical_emergency", severity: "high" };
  if (has("sexual_exploitation")) {
    return { category: "sexual_exploitation", severity: "high" };
  }
  if (has("coercion_blackmail")) {
    return { category: "coercion_blackmail", severity: "high" };
  }
  if (has("domestic_violence")) {
    return { category: "domestic_violence", severity: "high" };
  }
  if (has("child_elder_safety")) {
    return { category: "child_elder_safety", severity: "high" };
  }
  if (has("abuse_threat_unsafe")) {
    return { category: "abuse_threat_unsafe", severity: "high" };
  }
  if (has("gambling_debt")) return { category: "gambling_debt", severity: "high" };
  if (has("gambling") && has("money_debt")) {
    return { category: "gambling_debt", severity: "high" };
  }
  if (has("severe_debt_crisis")) {
    return { category: "severe_debt_crisis", severity: "high" };
  }
  if (has("legal_danger")) return { category: "legal_danger", severity: "high" };
  if (has("substance_addiction")) {
    return { category: "substance_addiction", severity: "high" };
  }
  if (has("curse_harm_request")) {
    return { category: "curse_harm_request", severity: "high" };
  }
  if (has("severe_burnout_despair")) {
    return { category: "severe_burnout_despair", severity: "high" };
  }
  if (has("guaranteed_spiritual_answer")) {
    return { category: "guaranteed_spiritual_answer", severity: "low" };
  }
  if (has("delusional_paranoid_fear")) {
    return { category: "delusional_paranoid_fear", severity: "medium" };
  }

  return null;
}

function matchesCategory(prayer: string, normalized: string, category: OngDiaWishCategory) {
  return CATEGORY_KEYWORDS[category].some((keyword) => {
    const normalizedKeyword = normalizePrayerText(keyword);
    return (
      hasKeywordMatch(prayer, keyword.toLowerCase()) ||
      hasKeywordMatch(normalized, normalizedKeyword)
    );
  });
}

export function routeOngDiaWish(prayer: string): OngDiaWishRoute {
  const trimmedPrayer = prayer.trim();
  const original = trimmedPrayer.toLowerCase();
  const normalized = normalizePrayerText(trimmedPrayer);

  if (!trimmedPrayer) {
    return { category: "vague_blessing", severity: "low" };
  }

  const immediateRisk = detectImmediateRisk(trimmedPrayer);
  if (immediateRisk) return immediateRisk;

  const priority: OngDiaWishCategory[] = [
    "self_harm",
    "medical_emergency",
    "sexual_exploitation",
    "coercion_blackmail",
    "domestic_violence",
    "child_elder_safety",
    "abuse_threat_unsafe",
    "curse_harm_request",
    "sexual_inappropriate",
    "gambling_debt",
    "gambling",
    "severe_debt_crisis",
    "legal_danger",
    "legal_trouble",
    "substance_addiction",
    "severe_burnout_despair",
    "delusional_paranoid_fear",
    "guaranteed_spiritual_answer",
    "money_debt",
    "grief_loss",
    "burnout_stress",
    "family_relationship",
    "shop_business",
    "trolling_spam_nonsense",
    "vague_blessing",
  ];

  const category =
    priority.find((candidate) => matchesCategory(original, normalized, candidate)) ??
    "unknown";

  if (category === "burnout_stress" && hasAnyKeyword(normalized, ["khong muon lam nua"])) {
    return { category, severity: "medium" };
  }

  return {
    category,
    severity: SERIOUS_CATEGORIES.has(category) ? "high" : "low",
  };
}

export function applySafetyOverride(
  response: OngDiaPrayerResponse,
  route: OngDiaWishRoute,
): OngDiaPrayerResponse {
  const safetyLine = DETERMINISTIC_SAFETY_LINES[route.category];
  const boundaryNudge = BOUNDARY_NUDGES[route.category];

  if (route.severity === "high") {
    return {
      ...response,
      khiChuyenQuaNang: safetyLine ?? response.khiChuyenQuaNang,
    };
  }

  const { khiChuyenQuaNang: _unused, ...lowRiskResponse } = response;
  if (boundaryNudge && !lowRiskResponse.ongNhacNhe.includes(boundaryNudge)) {
    return {
      ...lowRiskResponse,
      ongNhacNhe: boundaryNudge,
    };
  }

  return lowRiskResponse;
}

export function isSeriousOngDiaPrayer(prayer: string) {
  const route = routeOngDiaWish(prayer);
  return route.severity === "high";
}

export function createFallbackOngDiaPrayerResponse(
  prayer: string,
): OngDiaPrayerResponse {
  const route = routeOngDiaWish(prayer);
  const normalized = normalizePrayerText(prayer);
  const response = ((): OngDiaPrayerResponse => {

    if (
      route.category === "money_debt" &&
      hasAnyKeyword(normalized, ["trung so", "lottery", "ve so"])
    ) {
      return {
        loiOngDia:
          "Ông không hứa con số chắc trúng. Lộc hôm nay là giữ lòng tỉnh, đừng để may rủi kéo tay mình đi xa.",
        ongNhacNhe:
          "Con đang muốn một cú may để nhẹ gánh. Nhưng tiền nhà và lòng bình vẫn cần đứng trước chuyện hên xui.",
        viecNhoHomNay:
          "Giữ lại số tiền định mua thêm, rồi dùng nó cho một việc nhỏ thật cần hôm nay.",
      };
    }

    switch (route.category) {
      case "shop_business":
        return {
          loiOngDia:
            "Tiệm im một ngày chưa phải mất lộc. Giữ đèn sáng, giữ tay nghề sạch, khách cũ còn nhớ đường về.",
          ongNhacNhe:
            "Con đang lo nhịp khách chậm và sợ hụt tiền. Hôm nay đừng hoảng, cứ làm tiệm nhìn gọn và dễ quay lại.",
          viecNhoHomNay:
            "Chụp một set đẹp, nhắn nhẹ cho vài khách quen, rồi kiểm lại món nào dễ bán nhất.",
        };
    case "gambling":
    case "gambling_debt":
      return {
        loiOngDia:
          "Ông nghe lòng con đang nặng. Nợ với cờ bạc là chuyện không nên để một người ôm hết.",
        ongNhacNhe:
          "Trước hết giữ tiền nhà, giấy tờ, và sự an toàn của con. Đừng để ý muốn gỡ kéo tay đi xa hơn.",
        viecNhoHomNay:
          "Ghi rõ khoản nợ, ai đang giữ tiền, rồi nói với một người thân đáng tin.",
        khiChuyenQuaNang:
          "Nếu con bị ép, bị dọa, hoặc thấy không an toàn, tìm người thân đáng tin hay chỗ hỗ trợ gần mình ngay.",
      };
    case "severe_debt_crisis":
      return {
        loiOngDia:
          "Ông nghe chuyện tiền đang đè lên ngực con. Nợ càng rối càng phải giữ một đường sáng, đừng chạy trong tối.",
        ongNhacNhe:
          "Con cần bảo vệ tiền nhà, giấy tờ, và đừng để sợ hãi kéo mình ký thêm điều mới.",
        viecNhoHomNay:
          "Viết rõ từng khoản nợ, ngừng ký thêm, rồi nói với một người đáng tin hôm nay.",
      };
    case "money_debt":
      return {
        loiOngDia:
          "Lộc không chỉ là tiền vô, lộc còn là tránh mất thêm. Chuyện tiền nặng thì đi từng khoản, đừng ôm thành một cục tối.",
        ongNhacNhe:
          "Con cần nhìn rõ khoản nào gấp, khoản nào còn nói chuyện được, khoản nào phải tạm dừng trước.",
        viecNhoHomNay:
          "Viết ba khoản quan trọng nhất, rồi chọn một cuộc gọi hoặc một tin nhắn cần làm trước.",
      };
    case "family_relationship":
      return {
        loiOngDia:
          "Chuyện tình thân mà nặng thì nói chậm một nhịp. Giữ lòng mềm, nhưng đừng để mình bị kéo qua ranh giới.",
        ongNhacNhe:
          "Con đang chịu áp lực từ người thân hoặc một mối quan hệ. Lúc lòng nóng, đừng quyết chuyện lớn ngay.",
        viecNhoHomNay:
          "Viết một câu ranh giới ngắn, rồi chọn lúc yên hơn để nói.",
      };
    case "burnout_stress":
      return {
        loiOngDia:
          "Ông nghe người con đang mệt. Giữ vía bình lại trước đã, hôm nay không cần gồng như ngày nào cũng phải thắng.",
        ongNhacNhe:
          "Con đang kiệt sức hoặc chán nhịp làm. Chuyện trước mắt là giảm một chút nặng, không phải ép mình vui liền.",
        viecNhoHomNay:
          "Chọn một việc nhẹ nhất để làm trước, uống miếng nước, rồi xin nghỉ vài phút nếu có thể.",
      };
    case "grief_loss":
      return {
        loiOngDia:
          "Mất mát làm lòng lạnh xuống, Ông nghe. Có những ngày chỉ thở được thôi cũng đã là đi qua một đoạn.",
        ongNhacNhe:
          "Con không cần mạnh liền. Chuyện thương nhớ cần người ở cạnh và cần thời gian.",
        viecNhoHomNay:
          "Nhắn cho một người tin được, hoặc ngồi yên mười phút để lòng được khóc nếu cần.",
      };
    case "abuse_threat_unsafe":
    case "domestic_violence":
      return {
        loiOngDia:
          "Ông nghe chuyện này không nhẹ. Thân mình phải được giữ trước, rồi chuyện khác tính sau.",
        ongNhacNhe:
          "Nếu có dọa nạt hay đánh đập, đừng ở một mình với nỗi sợ. Con cần chỗ an toàn và người biết chuyện.",
        viecNhoHomNay:
          "Cất giấy tờ cần thiết, giữ điện thoại bên mình, rồi báo cho một người đáng tin.",
        khiChuyenQuaNang:
          "Nếu nguy hiểm đang ở trước mặt, rời tới chỗ an toàn và gọi hỗ trợ khẩn cấp tại nơi con ở.",
      };
    case "coercion_blackmail":
    case "sexual_exploitation":
      return {
        loiOngDia:
          "Ông nghe chuyện này làm lòng con sợ. Bị ép hay bị giữ hình riêng tư không phải lỗi của con.",
        ongNhacNhe:
          "Đừng thương lượng một mình với người đang dọa mình. Cần giữ bằng chứng và tìm người đáng tin đứng cạnh.",
        viecNhoHomNay:
          "Lưu lại tin nhắn, đừng gửi thêm gì, rồi nói với một người con tin được.",
      };
    case "child_elder_safety":
      return {
        loiOngDia:
          "Chuyện người yếu thế không thể để lặng trong nhà. Thấy không an thì phải gọi người lớn đáng tin tới gần.",
        ongNhacNhe:
          "Trẻ nhỏ, người già, hay người không tự bảo vệ được cần được đưa ra chỗ an toàn trước.",
        viecNhoHomNay:
          "Ghi lại điều con thấy, gọi người đáng tin, và đừng để người đó ở một mình nếu đang nguy hiểm.",
      };
    case "self_harm":
      return {
        loiOngDia:
          "Ông nghe lòng con đau quá rồi. Đêm tối này không nên để con ngồi một mình.",
        ongNhacNhe:
          "Lúc ý nghĩ muốn biến mất tới gần, mình cần người thật ở bên, không chỉ một lời vía.",
        viecNhoHomNay:
          "Gọi hoặc nhắn ngay cho một người tin được và nói: con đang không an toàn một mình.",
        khiChuyenQuaNang:
          "Nếu con có thể làm đau mình ngay lúc này, gọi hỗ trợ khẩn cấp tại nơi con ở hoặc đi tới chỗ có người ngay.",
      };
    case "medical_emergency":
      return {
        loiOngDia:
          "Có chuyện thân thể nguy cấp thì đừng chờ vía. Giữ mạng trước, khấn sau.",
        ongNhacNhe:
          "Đau ngực, khó thở, chảy máu nhiều, ngất, hay dấu hiệu cấp cứu cần người chuyên môn ngay.",
        viecNhoHomNay:
          "Gọi cấp cứu tại nơi con ở hoặc nhờ người gần nhất đưa đi khám ngay.",
        khiChuyenQuaNang:
          "Nếu triệu chứng đang xảy ra, tìm hỗ trợ y tế khẩn cấp ngay bây giờ.",
      };
    case "legal_trouble":
      return {
        loiOngDia:
          "Chuyện giấy tờ và pháp lý cần sáng lòng, không cần vội miệng. Nói sai một câu cũng làm đường rối thêm.",
        ongNhacNhe:
          "Con nên giữ lại giấy tờ, tin nhắn, ngày giờ, và đừng ký gì khi chưa hiểu rõ.",
        viecNhoHomNay:
          "Gom giấy tờ liên quan vào một chỗ và hỏi người có chuyên môn hoặc nơi hỗ trợ gần mình.",
        khiChuyenQuaNang:
          "Nếu có bắt buộc, đe dọa, hoặc nguy cơ mất an toàn, tìm hỗ trợ pháp lý hay khẩn cấp tại địa phương.",
      };
    case "legal_danger":
      return {
        loiOngDia:
          "Chuyện pháp lý nguy rồi thì đừng nói vội, đừng ký vội. Giữ giấy tờ rõ trước đã.",
        ongNhacNhe:
          "Con cần biết ai đang giữ giấy tờ, ai đang ép mình, và chuyện nào cần người có chuyên môn.",
        viecNhoHomNay:
          "Gom giấy tờ, lưu tin nhắn, rồi hỏi nơi hỗ trợ pháp lý hoặc người đáng tin gần mình.",
      };
    case "substance_addiction":
      return {
        loiOngDia:
          "Nghiện kéo người ta đi xa khỏi lòng mình. Ông nghe rồi, chuyện này cần người thật đứng cạnh.",
        ongNhacNhe:
          "Đừng giữ chuyện này trong bóng tối một mình. Cần giảm nguy hiểm trước, rồi mới tính đường dài.",
        viecNhoHomNay:
          "Nói với một người đáng tin và tránh chỗ, đồ, hoặc người kéo con quay lại hôm nay.",
      };
    case "severe_burnout_despair":
      return {
        loiOngDia:
          "Ông nghe người con đã mỏi tới tận lòng. Hôm nay đừng ép mình thành đá.",
        ongNhacNhe:
          "Khi mệt quá và muốn buông hết, mình cần có người ở gần, không phải tự gồng cho qua.",
        viecNhoHomNay:
          "Nhắn một người tin được rằng con đang đuối, rồi làm một việc nhỏ nhất để qua giờ này.",
      };
    case "delusional_paranoid_fear":
      return {
        loiOngDia:
          "Nỗi sợ khi lớn quá sẽ làm bóng đêm thành hình. Giữ vía bình lại, đừng ngồi một mình với nó.",
        ongNhacNhe:
          "Con đang thấy không yên và có thể khó phân biệt đâu là thật, đâu là sợ. Cần người tin được ngồi cạnh.",
        viecNhoHomNay:
          "Gọi một người đáng tin tới gần, uống nước, bật đèn, và đừng tự quyết chuyện lớn lúc đang sợ.",
      };
    case "guaranteed_spiritual_answer":
      return {
        loiOngDia:
          "Ông không đóng đời con bằng một câu chắc chắn. Vía tốt là biết dừng chỗ rối và bước lại cho ngay.",
        ongNhacNhe:
          "Con đang muốn một lời bảo đảm để lòng bớt sợ. Nhưng số phận không nên bị khóa bằng may rủi hay lời đoán.",
        viecNhoHomNay:
          "Hỏi lại một câu nhỏ hơn: việc nào hôm nay con có thể giữ cho đúng?",
      };
    case "sexual_inappropriate":
      return {
        loiOngDia:
          "Bàn thờ không giữ chuyện thô tục. Lời vào đây nên sạch để lòng mình cũng sạch.",
        ongNhacNhe:
          "Nếu con đang đùa, mình đổi câu hỏi nhẹ hơn. Nếu có chuyện riêng tư thật, giữ ranh giới và sự tôn trọng.",
        viecNhoHomNay:
          "Viết lại điều con cần xin bằng một câu đứng đắn và rõ lòng.",
      };
    case "curse_harm_request":
      return {
        loiOngDia:
          "Ông không giúp lời nguyền hay chuyện hại người. Giữ vía mình trước, đừng để giận kéo tay đi sai.",
        ongNhacNhe:
          "Con đang tức hoặc đau, nhưng trả thù thường làm lòng mình mất thêm.",
        viecNhoHomNay:
          "Rời khỏi cuộc cãi, uống nước, rồi viết một câu để giữ ranh giới thay vì nguyền rủa.",
      };
    case "trolling_spam_nonsense":
      return {
        loiOngDia:
          "Nếu ghé chơi thì ngồi cho đàng hoàng chút. Bàn Ông Địa nghe lời thật hơn lời quăng cho vui.",
        ongNhacNhe:
          "Con có thể xin một vía nhẹ, hỏi một chuyện nhỏ, hoặc chỉ ngồi thở một nhịp.",
        viecNhoHomNay:
          "Viết lại một câu ngắn mà con thật sự muốn gửi vào bàn này.",
      };
    case "vague_blessing":
      return {
        loiOngDia:
          "Vía nhẹ thì lòng phải nhẹ trước. Hôm nay đi chậm một nhịp, chuyện nhỏ sẽ bớt vướng.",
        ongNhacNhe:
          "Con đang cần một chút may mắn và bình tâm.",
        viecNhoHomNay:
          "Dọn một góc nhỏ cho sạch, uống miếng nước, rồi làm việc đầu tiên cho gọn tay.",
      };
    case "unknown":
    default:
      return {
        loiOngDia:
          "Ông nghe lòng con đang vướng. Chuyện này cần sáng lòng, không cần vội tay.",
        ongNhacNhe:
          "Con đang có một chuyện làm lòng bận. Không cần gỡ hết hôm nay, chỉ cần thấy rõ bước kế tiếp.",
        viecNhoHomNay:
          "Viết một câu: việc nào nằm trong tay mình hôm nay, rồi làm đúng một việc nhỏ đó trước.",
      };
    }
  })();

  return applySafetyOverride(response, route);
}
