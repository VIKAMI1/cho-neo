export type OngDiaWishCategory =
  | "vague_blessing"
  | "shop_business"
  | "money_debt"
  | "gambling"
  | "family_relationship"
  | "burnout_stress"
  | "grief_loss"
  | "abuse_threat_unsafe"
  | "self_harm"
  | "medical_emergency"
  | "legal_trouble"
  | "sexual_inappropriate"
  | "curse_harm_request"
  | "trolling_spam_nonsense"
  | "unknown";

export type OngDiaWishSeverity = "low" | "medium" | "high";

export type OngDiaPrayerResponse = {
  loiOngDia: string;
  ongNhacNhe: string;
  viecNhoHomNay: string;
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
  self_harm: [
    "chết cho rồi",
    "chet cho roi",
    "không muốn sống",
    "khong muon song",
    "muốn chết",
    "muon chet",
    "suicide",
    "tự tử",
    "tu tu",
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
  "gambling",
  "abuse_threat_unsafe",
  "self_harm",
  "medical_emergency",
  "legal_trouble",
]);

function normalizePrayerText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAnyKeyword(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function matchesCategory(prayer: string, normalized: string, category: OngDiaWishCategory) {
  return CATEGORY_KEYWORDS[category].some((keyword) => {
    const normalizedKeyword = normalizePrayerText(keyword);
    return prayer.includes(keyword.toLowerCase()) || normalized.includes(normalizedKeyword);
  });
}

export function routeOngDiaWish(prayer: string): OngDiaWishRoute {
  const trimmedPrayer = prayer.trim();
  const original = trimmedPrayer.toLowerCase();
  const normalized = normalizePrayerText(trimmedPrayer);

  if (!trimmedPrayer) {
    return { category: "vague_blessing", severity: "low" };
  }

  const priority: OngDiaWishCategory[] = [
    "self_harm",
    "medical_emergency",
    "abuse_threat_unsafe",
    "curse_harm_request",
    "sexual_inappropriate",
    "gambling",
    "legal_trouble",
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

export function isSeriousOngDiaPrayer(prayer: string) {
  const route = routeOngDiaWish(prayer);
  return route.severity === "high";
}

export function createFallbackOngDiaPrayerResponse(
  prayer: string,
): OngDiaPrayerResponse {
  const route = routeOngDiaWish(prayer);
  const normalized = normalizePrayerText(prayer);

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
      return {
        loiOngDia:
          "Ông nghe lòng con đang nặng. Nợ với cờ bạc là chuyện không nên để một người ôm hết.",
        ongNhacNhe:
          "Trước hết giữ tiền nhà, giấy tờ, và sự an toàn của con. Đừng lấy nợ mới che nợ cũ.",
        viecNhoHomNay:
          "Ghi rõ khoản nợ, ai đang giữ tiền, rồi nói với một người thân đáng tin.",
        khiChuyenQuaNang:
          "Nếu con bị ép, bị dọa, hoặc thấy không an toàn, tìm người thân đáng tin hay chỗ hỗ trợ gần mình ngay.",
      };
    case "money_debt":
      return {
        loiOngDia:
          "Lộc không chỉ là tiền vô, lộc còn là tránh mất thêm. Chuyện tiền nặng thì đi từng khoản, đừng ôm thành một cục tối.",
        ongNhacNhe:
          "Con cần nhìn rõ khoản nào gấp, khoản nào còn nói chuyện được, khoản nào không nên vay thêm để che.",
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
}
