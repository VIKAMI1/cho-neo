export type XinXamTopic = "tiem" | "tien" | "tinh" | "ban-than";

export type XinXamLuck = "DAI_CAT" | "CAT" | "BINH" | "HUNG";

export type XinXamStick = {
  id: string;
  topic: XinXamTopic;
  luck: XinXamLuck;
  title: string;
  lucBat: string;
  meaning: string;
  advice: string;
  comebackLine: string;
  periodKind: "day" | "week";
  periodKey?: string;
};

export type XinXamTopicOption = {
  key: XinXamTopic;
  label: string;
  helper: string;
};

export type OngDiaDailyMessage = {
  id: string;
  title: string;
  body: string;
  comebackLine: string;
};

export type OngDiaLocReading = {
  id: string;
  waterLine: string;
  vibeLine: string;
  comebackLine: string;
};

export const XIN_XAM_TOPICS: XinXamTopicOption[] = [
  {
    key: "tiem",
    label: "Tiệm",
    helper: "Lịch, khách, thợ, nhịp làm ăn trong shop.",
  },
  {
    key: "tien",
    label: "Tiền",
    helper: "Giữ tiền, tính giá, nợ nhỏ, lộc đều.",
  },
  {
    key: "tinh",
    label: "Tình",
    helper: "Người thương, gia đình, bạn bè, chuyện trong lòng.",
  },
  {
    key: "ban-than",
    label: "Bản thân",
    helper: "Sức khỏe tinh thần, nghỉ ngơi, ranh giới riêng.",
  },
];

export const ONG_DIA_DAILY_MESSAGES: OngDiaDailyMessage[] = [
  {
    id: "giu-nhip",
    title: "Đi chậm, nhìn kỹ, làm ăn có đức thì làng nhớ tên.",
    body:
      "Ông Địa nhắc nhẹ: hôm nay đừng chạy nhanh hơn cái lòng mình chịu nổi. Làm kỹ một đoạn, nói ngọt một câu, giữ vía cho tiệm yên.",
    comebackLine: "Mai ghé lại, coi lòng có nhẹ hơn một chút không.",
  },
  {
    id: "giu-duyen",
    title: "Có duyên thì khách quay lại, có tâm thì nghề ở lâu.",
    body:
      "Ông Địa nghe tiếng kéo ghế, tiếng máy chạy, tiếng người thở dài. Hôm nay cứ giữ một việc cho tử tế, đừng ôm hết mọi chuyện vào người.",
    comebackLine: "Có lộc thì nhận, chưa có thì giữ vía cho yên.",
  },
  {
    id: "giu-than",
    title: "Tiệm sáng là nhờ tay, tay bền là nhờ biết nghỉ.",
    body:
      "Ông Địa nhắc nhẹ: nghỉ không làm mất lộc. Nghỉ đúng lúc là giữ cái nghề, giữ cái lưng, giữ nụ cười với khách.",
    comebackLine: "Mai quay lại xin một lời mới, hôm nay làm vừa đủ thôi.",
  },
];

export const ONG_DIA_LOC_READINGS: OngDiaLocReading[] = [
  {
    id: "duyen-truoc",
    waterLine:
      "Nước mở lộc: Hôm nay đừng rượt tiền tip trước, rượt cái duyên trước. Chào khách ngọt, làm kỹ đoạn cuối, đừng nóng tay.",
    vibeLine: "Câu lấy vía: 'Màu này lên tay chị sạch và sang lắm.'",
    comebackLine: "Khách vui thì tay họ tự mở. Mai ghé lại xin vía mới.",
  },
  {
    id: "giu-ban",
    waterLine:
      "Nước mở lộc: Lau bàn cho sạch, dọn chai cho ngay, để khách thấy mình có tâm trước khi họ thấy màu.",
    vibeLine: "Câu lấy vía: 'Chị ngồi thoải mái nha, em làm kỹ cho đẹp.'",
    comebackLine: "Có lộc thì nhận, chưa có thì giữ vía cho yên.",
  },
  {
    id: "noi-ro",
    waterLine:
      "Nước mở lộc: Nói rõ giá, rõ giờ, rõ việc trước khi bắt đầu. Lòng rõ thì tay bớt run.",
    vibeLine: "Câu lấy vía: 'Mình làm kiểu này sẽ sạch và bền hơn nha chị.'",
    comebackLine: "Ông Địa thích người làm ăn rõ ràng, không đoán mò.",
  },
  {
    id: "cham-cuoi",
    waterLine:
      "Nước mở lộc: Đoạn cuối đừng vội. Một lớp dầu, một lời khen, một cái nhìn lại form có thể giữ duyên cả ngày.",
    vibeLine: "Câu lấy vía: 'Để em coi lại cho hai bên đều nha.'",
    comebackLine: "Lộc nhỏ thường nằm ở chỗ mình không làm ẩu.",
  },
  {
    id: "tim-lai",
    waterLine:
      "Nước mở lộc: Mất gì thì đừng cuống. Quay lại chỗ cuối cùng còn bình tĩnh, nhìn thấp trước, nhìn túi áo sau.",
    vibeLine: "Câu lấy vía: 'Con đi chậm lại, đồ cần gặp sẽ tự hiện ra.'",
    comebackLine: "Ông Địa nhắc nhẹ: càng rối càng phải thở chậm.",
  },
  {
    id: "giu-bung",
    waterLine:
      "Nước mở lộc: Bụng không yên thì ngày cũng nghiêng. Uống nước ấm, ăn nhẹ, bớt ôm việc nặng trong một nhịp.",
    vibeLine: "Câu lấy vía: 'Thân con cũng là cái tiệm nhỏ cần chăm.'",
    comebackLine: "Không chắc khỏe thì hỏi người có chuyên môn; còn hôm nay cứ nhẹ tay với mình.",
  },
  {
    id: "thi-cu",
    waterLine:
      "Nước mở lộc: Chuyện thi cử hay giấy tờ cần đầu sáng hơn lòng nóng. Chia bài ra từng đoạn nhỏ, làm đoạn gần nhất trước.",
    vibeLine: "Câu lấy vía: 'Con học phần trước mắt, đường sau tự mở thêm.'",
    comebackLine: "Can đảm không phải hết run; can đảm là vẫn ngồi xuống làm.",
  },
  {
    id: "yen-nha",
    waterLine:
      "Nước mở lộc: Chuyện nhà đừng đem hết ra đứng giữa tiệm. Chọn một câu mềm, một giờ yên, một người đáng tin để nói.",
    vibeLine: "Câu lấy vía: 'Nhà có gió thì con đóng bớt cửa, không đóng lòng.'",
    comebackLine: "Ông Địa nghe rồi. Giữ vía bình an trước, giải từng nút sau.",
  },
];

// Sticky V1 uses a small local seed subset only. The known legacy corpus has
// 96 sticks; migrate that full corpus here in a later data task.
export const LOCAL_XIN_XAM_SEED_STICKS: XinXamStick[] = [
  {
    id: "tiem-giu-nhip-cat",
    topic: "tiem",
    luck: "CAT",
    title: "Giữ Nhịp Tiệm",
    lucBat:
      "Khách đông đừng vội quên mình,\nChừa thêm khe thở, tiệm bình an hơn.",
    meaning:
      "Tiệm đang có lộc, nhưng lộc bền khi lịch có khoảng thở. Làm đều tay quan trọng hơn nhận thêm cho đầy sổ.",
    advice:
      "Tuần này chừa một buffer nhỏ giữa các ca nặng. Ông Địa nhắc nhẹ: đừng lấy lưng mình trả tiền cho lịch quá dày.",
    comebackLine: "Mai quay lại coi tiệm có nhẹ hơn chút nào chưa.",
    periodKind: "week",
  },
  {
    id: "tiem-noi-khong-binh",
    topic: "tiem",
    luck: "BINH",
    title: "Nói Không Cho Êm",
    lucBat:
      "Miệng cười mà mắt đã cay,\nMột câu từ chối, giữ ngày khỏi nghiêng.",
    meaning:
      "Không phải khách nào cũng cần nhận. Có những ca thêm vào chỉ làm cả tiệm mất nhịp.",
    advice:
      "Tập một câu từ chối mềm: 'Hôm nay em full rồi, để em kiếm giờ khác cho chị nha.'",
    comebackLine: "Tuần này giữ một ranh giới nhỏ là đã có lộc.",
    periodKind: "week",
  },
  {
    id: "tien-loc-nho-cat",
    topic: "tien",
    luck: "CAT",
    title: "Lộc Nhỏ Giữ Lâu",
    lucBat:
      "Lộc về như giọt mưa hiền,\nĐừng đem xài hết, để yên một phần.",
    meaning:
      "Tiền không cần tới kiểu trúng lớn mới gọi là may. Một phần giữ lại đều đều cũng là lộc.",
    advice:
      "Chọn một khoản nhỏ hôm nay để cất riêng. Đừng đợi dư nhiều mới bắt đầu giữ.",
    comebackLine: "Tuần sau coi hũ nhỏ có làm lòng nhẹ hơn không.",
    periodKind: "week",
  },
  {
    id: "tien-ro-gia-binh",
    topic: "tien",
    luck: "BINH",
    title: "Rõ Giá Rõ Lòng",
    lucBat:
      "Giá mờ thì bụng cũng mờ,\nNói ngay từ trước, đỡ chờ giận sau.",
    meaning:
      "Một phần mệt mỏi tiền bạc đến từ nói giá không rõ, rồi tự ôm bực vào người.",
    advice:
      "Viết lại một dòng giá hoặc policy đang hay gây hiểu lầm. Rõ trước thì nhẹ sau.",
    comebackLine: "Ông Địa thích giấy tờ rõ ràng hơn lời đoán mò.",
    periodKind: "week",
  },
  {
    id: "tinh-noi-nhe-cat",
    topic: "tinh",
    luck: "CAT",
    title: "Nói Nhẹ Mà Thật",
    lucBat:
      "Lời mềm không phải lời thua,\nNói cho ngay thật, gió mưa cũng hiền.",
    meaning:
      "Chuyện tình cảm hôm nay cần thật lòng, nhưng không cần làm lớn. Một câu nói rõ có thể mở cửa.",
    advice:
      "Nếu cần nhắn ai đó, nhắn ngắn thôi: mình đang nghĩ gì, mình cần gì, không kết tội.",
    comebackLine: "Hôm nay nói nhẹ. Mai lòng tự biết có yên hơn không.",
    periodKind: "week",
  },
  {
    id: "tinh-dung-doan-hung",
    topic: "tinh",
    luck: "HUNG",
    title: "Đừng Đoán Thay Người",
    lucBat:
      "Ngồi đoán lòng kẻ bên kia,\nTự mình thắt nút, tự chia nỗi buồn.",
    meaning:
      "Đoán quá nhiều làm lòng mệt. Có chuyện cần hỏi thẳng, có chuyện cần để yên cho qua một đêm.",
    advice:
      "Đừng quyết định lúc đang nóng. Uống nước, ngủ một giấc, rồi hỏi bằng một câu tử tế.",
    comebackLine: "Ông Địa nhắc nhẹ: đừng tự biên kịch rồi tự đau.",
    periodKind: "week",
  },
  {
    id: "ban-than-nghi-dung-cat",
    topic: "ban-than",
    luck: "CAT",
    title: "Nghỉ Cũng Là Làm",
    lucBat:
      "Đèn còn leo lét cuối ngày,\nChe tay một chút, lửa này sáng lâu.",
    meaning:
      "Nghỉ không phải lười. Nghỉ đúng lúc là giữ nghề, giữ thân, giữ lòng với khách.",
    advice:
      "Chọn một khoảng nghỉ thật, không dọn kho, không trả tin nhắn, không tự trách.",
    comebackLine: "Mai quay lại, coi người mình có bớt căng không.",
    periodKind: "week",
  },
  {
    id: "ban-than-bot-om-binh",
    topic: "ban-than",
    luck: "BINH",
    title: "Bớt Ôm Hết",
    lucBat:
      "Vai gầy mà gánh cả sân,\nĐặt bớt một gánh, lòng dần nhẹ ra.",
    meaning:
      "Bạn đang ôm nhiều hơn phần của mình. Không cần bỏ hết, chỉ cần đặt xuống một việc không thuộc về mình.",
    advice:
      "Hôm nay chọn một việc để nhờ, hoãn, hoặc nói 'để mai'. Không ai bền nếu cứ tự làm hết.",
    comebackLine: "Ông Địa để dành một ghế cho người biết thở.",
    periodKind: "week",
  },
];
