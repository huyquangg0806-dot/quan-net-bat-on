// Dữ liệu & cân bằng game — chỉnh các con số ở đây để đổi độ khó.

const CONFIG = {
  GAME_HOUR_MS: 15000,     // 1 giờ trong game = 15 giây thật
  OPEN_HOUR: 8,
  MAX_OPEN_UNTIL: 32,      // mở muộn nhất tới 8h sáng hôm sau (giờ game chạy liên tục: 24 = 0h, 32 = 8h)
  EVENT_END_HOUR: 21,      // cúp điện, trộm, công an kiểm tra hàng chỉ lên lịch trước giờ này

  // Mở đêm & đóng cửa chủ động
  LIGHTS_FROM: 18,            // từ giờ này quán bật đèn, biển hiệu...
  LIGHTS_PER_HOUR: 3000,      // ...tốn chừng này mỗi giờ còn mở cửa (có khách hay không)
  NIGHT_FROM: 22,             // sau giờ này tính lương ca đêm, nhân viên mệt
  SHIFT_HOURS: 14,            // lương ngày trả cho ca 8h–22h
  NIGHT_WAGE_MUL: 1.5,        // lương mỗi giờ ca đêm = lương ngày / SHIFT_HOURS × hệ số này
  NIGHT_STAFF_TIRED: 2,       // ca đêm: nhân viên ghi sai đơn nhiều gấp mấy lần
  CLOSE_HIT_PER_HOUR: 5,      // đóng cửa ngay: khách mất chừng này hài lòng mỗi giờ còn lại (đã hoàn tiền)
  CLOSE_HIT_MAX: 15,
  NIGHT_POLICE_FROM: 23,      // công an kiểm tra giờ giấc từ 23h...
  NIGHT_POLICE_TO: 30,        // ...tới 6h sáng
  NIGHT_POLICE_BASE: 0.04,    // mỗi giờ game mở trong khung này: khả năng bị kiểm tra
  NIGHT_POLICE_PER_CUST: 0.015, // ...cộng thêm mỗi khách đang chơi
  NIGHT_POLICE_NOISE: 2,      // đang có khách ồn: dễ bị hàng xóm báo
  NIGHT_POLICE_KID: 2,        // có học sinh đang chơi
  SHUTTER_POLICE_MUL: 0.3,    // kéo cửa cuốn: rủi ro còn chừng này
  NIGHT_FINES: [0, 300000, 800000],   // lần 1 cảnh cáo, lần 2, lần 3 trở đi
  NIGHT_SUSPEND_AT: 3,        // vi phạm lần thứ mấy thì bị đình chỉ ngày hôm sau
  NIGHT_RATING_HIT: 0.15,     // từ lần 2: đánh giá giảm
  NIGHT_STRIKE_RESET: 14,     // sạch chừng này ngày thì xóa số lần vi phạm
  OVERNIGHT_FROM: 21,         // khách xin bao đêm từ giờ này...
  OVERNIGHT_TO: 24,           // ...tới nửa đêm
  OVERNIGHT_UNTIL: 30,        // bao đêm chơi tới 6h sáng
  OVERNIGHT_CHANCE: 0.4,      // khách người lớn tới trong khung giờ đó: khả năng xin bao đêm
  OVERNIGHT_PAY_HOURS: 5,     // giá bao đêm = chừng này giờ chơi
  SPEEDS: [1, 2, 4],          // nút tua nhanh

  START_MONEY: 200000,
  MAX_PCS: 12,
  PC_COST: 350000,         // giá mua thêm một máy (máy thường, đồ cơ bản)
  RENT_BASE: 50000,        // tiền mặt bằng mỗi ngày
  RENT_PER_PC: 5000,       // bảo trì mỗi máy mỗi ngày
  BANKRUPT_AT: -300000,

  // Sổ sách, thuế hư cấu và kế toán thuê ngoài
  ACCOUNT_DAYS: 5,             // số ngày mỗi kỳ báo cáo
  ACCOUNT_HISTORY: 6,          // số báo cáo gần nhất được giữ
  ACCOUNT_FEE: 60000,          // tiền thuê trả trước cho một hợp đồng 5 ngày
  TAX_FREE: 500000,            // phần lợi nhuận được miễn mỗi kỳ
  TAX_UPPER: 1500000,          // từ ngưỡng này trở lên áp dụng bậc cao
  TAX_RATE: 0.1,
  TAX_HIGH_RATE: 0.15,
  TAX_GRACE: 2,               // số ngày được đóng sau khi chốt
  TAX_LATE_RATE: 0.02,         // phạt mỗi ngày trễ, theo thuế gốc
  TAX_LATE_CAP: 0.2,          // tổng phạt tối đa 20% thuế gốc

  // Kho đồ thải: thu hồi một phần nhỏ giá vốn, không phục vụ lại cho khách
  WASTE_CAP: 100,             // số đơn vị kho giữ được
  WASTE_KEEP_DAYS: 5,
  WASTE_PACK_RATIO: 0.1,
  WASTE_COOKED_RATIO: 0.02,
  WASTE_BARGAIN_CHANCE: 0.6,  // thương lượng: tăng giá / giữ giá / rút lời chào
  WASTE_KEEP_CHANCE: 0.25,
  WASTE_BARGAIN_BONUS: 0.25,

  STAFF_PCS: 3,           // mỗi nhân viên phụ trách tối đa 3 máy đang có khách
  STAFF_WAGE_DEFAULT: 50000,
  STAFF_WAGE_MIN: 30000,
  STAFF_WAGE_MAX: 150000,
  STAFF_TRAIN_COST: 60000,
  STAFF_CLEAN_SECONDS: 4, // thời gian nhân viên lau một bàn
  STAFF_LOAD_PATIENCE: 30, // khách đã vào máy chờ chủ quán nạp giờ (giây thật)
  STAFF_AUTO_LOAD_SECONDS: 2, // nhân viên đã đào tạo nạp một lượt, từng khách một (giây thật)

  QUEUE_MAX: 5,
  QUEUE_PATIENCE: 28,      // giây thật khách chịu đứng chờ ở cửa
  ORDER_PATIENCE: 38,      // giây thật khách chờ đồ ăn
  AC_PATIENCE_BONUS: 1.35,

  REPAIR_SECONDS: 2,
  BREAK_PER_HOUR: 0.06,    // xác suất một máy bị treo mỗi giờ chơi
  BROKEN_SAT_DRAIN: 2,     // độ hài lòng mất mỗi giây khi máy treo
  PING_SAT_DRAIN: 1.2,     // hài lòng mất mỗi giây khi mạng quá tải
  PING_MAX_LOSS: 20,       // mỗi khách mất tối đa chừng này điểm vì mạng
  MAX_LOAD_HOURS: 5,
  HOUR_FILL_RATE: 1.25,    // giờ nạp được mỗi giây khi giữ nút
  HOUR_PERFECT: 0.12,      // lệch trong khoảng này = nạp chuẩn
  COOK_FILL_RATE: 30,      // % chín mỗi giây
  POUR_FILL_RATE: 38,      // % ly mỗi giây

  // Xác suất khách để lại review theo số sao (chỉ số 1–5). Khách bực thì hay review hơn.
  REVIEW_CHANCE: [0, 0.85, 0.6, 0.3, 0.4, 0.6],
  REVIEW_KEEP: 40,         // số review lưu lại

  // Máy treo: mỗi sự cố chỉ trừ điểm có giới hạn
  BREAK_GIVEUP: 30,        // giây thật khách chịu ngồi chờ máy treo, quá thì bỏ về
  FIX_FAST: 5,             // sửa xong trong số giây này (tính từ lúc treo) = "sửa ngay"
  BOARD_MEMO: 4,           // số khách đáng nhớ trên bảng cuối ngày

  // Khách quen
  REG_MAX: 36,             // số khách tối đa trong sổ khách quen
  REG_CHANCE_MAX: 0.55,    // tỉ lệ tối đa một lượt khách là người quen quay lại
  REG_LEAVE_AT: 15,        // thiện cảm dưới mức này thì khách chuyển sang quán khác
  SHY_FLASH: 3,            // giây bong bóng gọi món của khách rụt rè hiện rõ trước khi thu lại thành 💭

  SPAWN_BASE: 31,          // càng nhỏ khách tới càng dày
  PACE_LINEAR_PCS: 3,      // từ máy thứ 4, lượng khách tăng chậm hơn
  PACE_EXTRA_PC_MUL: 1.5,  // sức hút máy thêm = căn bậc hai số máy thêm × hệ số
  PACE_MIN_SPAWN: 4,      // giây thật tối thiểu giữa hai lượt khách ở tốc độ ×1
  PACE_TASK_MUL: 0.35,    // mỗi việc tồn giãn thêm chừng này lần khoảng cách khách
  PACE_MAX_BUSY_MUL: 3,   // giới hạn giãn khách khi tồn việc
  PACE_EVENT_REST: 10,    // giây thật không đón khách/sinh thêm ồn, mẹ gank sau sự kiện lớn
  HOT_MULT: 2.5,           // game đang hot được khách tìm nhiều gấp mấy lần
  LOST_LINGER: 4,          // giây thật khách hỏi game quán chưa có rồi bỏ đi

  // Lịch tuần & tuần thi (ngày 1 là Thứ 2)
  WEEKEND_DEMAND: 1.3,     // Thứ 7, Chủ nhật khách tới đông hơn
  EXAM_FROM_DAY: 22,       // tuần thi đầu tiên bắt đầu ngày này (một Thứ 2)...
  EXAM_CYCLE: 28,          // ...rồi cứ mỗi 28 ngày lại có một tuần thi
  EXAM_KID_MUL: 0.3,       // tuần thi: học sinh chỉ còn chừng này
  EXAM_AFTER_MUL: 1.5,     // ngày đầu thi xong: học sinh đổ về đông hơn

  // Khách ồn ào (tính cách 📢): hát hò, la hét làm khách cùng hàng máy khó chịu
  NOISE_FROM_DAY: 4,       // từ ngày này khách mới bắt đầu làm ồn
  NOISE_PER_HOUR: 0.35,    // khách 📢 đang chơi: khả năng bắt đầu ồn mỗi giờ game
  NOISE_ON_LOSE: 0.4,      // khách 📢 thua trận đập phím: khả năng la hét luôn
  NOISE_SAT_DRAIN: 0.6,    // hài lòng mất mỗi giây của mỗi khách ngồi cạnh
  NOISE_MAX_LOSS: 15,      // mỗi khách ngồi cạnh mất tối đa chừng này mỗi lượt chơi
  NOISE_CALM_CHANCE: 0.7,  // nhắc nhở: khả năng khách chịu im
  NOISE_CALM_HARD: 0.5,    // ...khách nóng vội hoặc nói chuyện thẳng thì khó hơn
  NOISE_CALM_RETRY: 0.2,   // mỗi lần nhắc không được, lần sau dễ nghe hơn chừng này
  NOISE_LOUDER: 1.5,       // nhắc không được: khách cãi lại, ồn hơn
  NOISE_STAFF_DELAY: 6,    // giây thật trước khi nhân viên tự đi nhắc (mỗi đợt ồn nhắc một lần)
  NOISE_HEADPHONE: 0.4,    // có tai nghe chống ồn: khách ngồi cạnh chỉ khó chịu chừng này

  // Mẹ gank: phụ huynh tới quán tìm con (chỉ học sinh)
  MOM_FROM_DAY: 5,         // từ ngày này phụ huynh mới bắt đầu đi tìm
  MOM_RATE: 0.08,          // mỗi giờ game, mỗi học sinh đang chơi: khả năng bị tìm (như nhau ở mọi giờ)
  MOM_EXAM_MUL: 2,         // tuần thi: phụ huynh canh con kỹ gấp đôi
  MOM_MAX_PER_DAY: 2,
  MOM_HIDE_CHANCE: 0.6,    // giấu giùm: khả năng không bị lộ...
  MOM_HIDE_PER_KID: 0.15,  // ...mỗi học sinh khác đang trong quán làm giảm chừng này (dễ lộ)
  MOM_HIDE_AFF: 15,        // giấu được: khách quen thêm chừng này thiện cảm
  MOM_REPORT_FROM: 21,     // bị lộ từ giờ này: phụ huynh có thể báo công an chuyện cho trẻ chơi khuya
  MOM_REPORT_CHANCE: 0.4,
  MOM_FINE: 150000,        // phạt mỗi tin báo cho học sinh chơi khuya
  MOM_PANIC: 0.25,         // mỗi học sinh khác thấy bạn bị bắt về: khả năng hoảng, về sớm

  // Trộm linh kiện
  THIEF_FROM_DAY: 7,       // từ ngày này mới có trộm
  THIEF_DAY_CHANCE: 0.25,  // mỗi ngày: khả năng có một tên trộm ghé (có camera thì giảm một nửa)
  THIEF_CATCH_SEC: 6,      // giây thật để bấm bắt kẻ trộm đang chạy ra cửa
  THIEF_CAM_SEC: 2,        // có camera: thêm chừng này giây
  THIEF_STAFF_CATCH: 0.4,  // có nhân viên: khả năng nhân viên tự tóm được
  THIEF_REWARD: 100000,    // giao công an: tiền thưởng
  THIEF_FINE: 50000,       // bắt đền tại chỗ
  THIEF_RELAPSE: 0.15,     // khách từng được tha: mỗi lần ghé có khả năng trộm lại
  THIEF_PARTS: { mouse: 0.4, kb: 0.3, mon: 0.2, gpu: 0.1 },   // món hay bị lấy
  THIEF_BASE_REPLACE: { mouse: 30000, kb: 40000, mon: 300000, gpu: 500000 },   // mua lại đồ cấp thấp nhất

  // Hàng cận date & hết date
  NEAR_DISCOUNT: 0.5,      // hàng cận date rẻ hơn 50%
  NEAR_SHELF_RATIO: 0.2,   // ...nhưng chỉ còn 20% hạn dùng (ít nhất 1 ngày)
  EXPIRED_KEEP_DAYS: 3,    // hết date quá số ngày này thì hư hẳn, tự bỏ
  SICK_CHANCE: [0, 0.35, 0.55, 0.75],   // khả năng khách đau bụng theo số ngày đã quá hạn
  REPORT_CHANCE: 0.5,      // khách đau bụng gọi báo công an
  POLICE_RANDOM: 0.12,     // mỗi ngày có khả năng công an ghé kiểm tra bất chợt
  FINE_REPORT: 200000,     // phạt mỗi tin báo khách ngộ độc
  FINE_PER_ITEM: 20000,    // phạt mỗi món hết date tìm thấy trong kho

  // Nhiệt độ & điều hòa
  FORECAST: [27, 38],      // nhiệt độ ngoài trời cao nhất trong ngày (lúc trưa), dao động trong khoảng này
  HEAT_PER_PC: 0.7,        // mỗi máy đang chạy làm phòng nóng thêm chừng này độ
  TEMP_SPEED: 2.5,         // nhiệt độ phòng đổi tối đa mỗi giờ game
  AC_TEMP: 25,             // điều hòa kéo phòng về quanh mức này...
  AC_LOAD_PER_PC: 0.3,     // ...cộng thêm theo số máy đang chạy
  HOT_TEMP: 32,            // nóng từ mức này: máy dễ treo, khách mau hết kiên nhẫn
  HOT_BREAK_MUL: 1.6,
  HOT_QUEUE_DRAIN: 1.3,    // khách chờ ở cửa hao kiên nhẫn nhanh hơn
  HEAT_SAT_DRAIN: 0.5,     // hài lòng mất mỗi giây khi quán nóng
  HEAT_MAX_LOSS: 12,
  AC_POWER: 2000,          // tiền điện điều hòa mỗi giờ game
  INVERTER_SAVE: 0.4,      // máy lạnh Inverter bớt 40% tiền điện điều hòa

  // Cúp điện
  OUTAGE_FROM_DAY: 5,      // từ ngày này mới có lịch cúp điện
  OUTAGE_PLANNED: 0.2,     // khả năng ngày mai có lịch cúp điện (báo trước)
  OUTAGE_LEN: [1.5, 3],    // số giờ cúp theo lịch
  SURPRISE_FROM_DAY: 9,
  OUTAGE_SURPRISE: 0.07,   // khả năng cúp điện bất ngờ trong ngày
  SURPRISE_LEN: [0.5, 1.5],
  OUTAGE_HIT: -15,         // không có UPS: khách mất trận đang chơi
  UPS_GRACE: 8,            // có UPS: giây thật khách kịp lưu game, chưa bực
  DARK_SAT_DRAIN: 1.5,     // hài lòng mất mỗi giây khi máy tắt vì cúp điện
  DARK_GIVEUP: 25,         // giây thật khách chịu ngồi chờ có điện, quá thì đòi tiền rồi về
  GEN_FUEL_BASE: 3000,     // tiền xăng máy phát mỗi giờ game
  GEN_FUEL_PER_PC: 2500,   // ...cộng thêm mỗi máy đang chạy
  GEN_FUEL_AC: 4000,       // ...cộng thêm nếu vẫn bật điều hòa

  // Hóa đơn tuần & vay vốn
  BILL_DAYS: 7,            // mặt bằng, mạng, điện cộng dồn rồi chốt hóa đơn mỗi 7 ngày
  BILL_GRACE: 2,           // số ngày được trả sau khi chốt
  LATE_FEE: 0.05,          // phạt mỗi ngày trễ, tính trên số tiền hóa đơn
  CUT_AFTER: 3,            // trễ chừng này ngày thì bị cắt mạng
  EVICT_AFTER: 7,          // trễ chừng này ngày thì chủ nhà lấy lại mặt bằng (phá sản)
  BANK_BASE: 150000,       // hạn mức vay ngân hàng cơ bản...
  BANK_PER_PC: 60000,      // ...cộng thêm mỗi máy, nhân theo điểm đánh giá
  BANK_RATE: 0.005,        // lãi ngân hàng mỗi ngày
  SHARK_MAX: 400000,       // vay nóng tối đa
  SHARK_RATE: 0.03,        // lãi vay nóng mỗi ngày
  SHARK_DUE_DAYS: 7,       // quá chừng này ngày chưa trả hết thì có người tới đòi nợ
  SHARK_RATING_HIT: 0.08,
  SELL_RATIO: 0.4,         // thanh lý máy được 40% tiền đã bỏ ra

  // Hao mòn phím chuột
  SMASH_PER_HOUR: 0.05,    // khả năng khách đập phím mỗi giờ chơi (khách thường)
  SMASH_DMG: [15, 30],     // độ bền mất mỗi lần đập (đồ xịn bền hơn)
  WORN_AT: 30,             // độ bền dưới mức này thì cảnh báo
  WORN_HIT: -15,           // khách ngồi máy phím chuột đã liệt
  FIX_CHEAP: 10000,        // sửa tạm: hồi 50 độ bền
  FIX_CHEAP_GAIN: 50,
  REPLACE_BASE: 30000,     // thay mới: giá tăng theo cấp chuột + phím
  REPLACE_PER_LV: 20000,
};

// Hạng máy = cấp thấp hơn giữa CPU và card đồ họa (xem PARTS). rate = giá gốc mỗi giờ.
const TIERS = {
  1: { name: 'Máy thường',  short: 'Thường',  phrase: 'máy thường',  icon: '🖥️', rate: 8000,  power: 2000 },
  2: { name: 'Máy Pre',     short: 'Pre',     phrase: 'máy Pre',     icon: '💻', rate: 12000, power: 3000 },
  3: { name: 'Máy VIP',     short: 'VIP',     phrase: 'máy VIP',     icon: '👑', rate: 18000, power: 4200 },
  4: { name: 'Máy Pro Max', short: 'Pro Max', phrase: 'máy Pro Max', icon: '💎', rate: 25000, power: 5500 },
};

// ---------- Linh kiện từng máy ----------
// Mỗi món có 4 cấp (0–3). cost[i] = giá nâng lên cấp i (cấp 0 có sẵn).
// CPU + card: cấp thấp hơn trong hai món quyết định hạng máy (cấp 0 = Thường … cấp 3 = Pro Max).
// Đồ chơi game & bàn ghế: mỗi cấp cộng thêm tiền giờ (bonus) và làm khách vui hơn (sat).
const PARTS = {
  cpu:   { name: 'CPU', icon: '🧠', core: true, cost: [0, 150000, 350000, 700000],
           levels: ['Chíp Core Ai-3', 'Chíp Core Ai-5', 'Chíp Core Ai-7', 'Chíp Core Ai-9'] },
  gpu:   { name: 'Card đồ họa', icon: '🎴', core: true, cost: [0, 250000, 500000, 1000000],
           levels: ['Card onboard', 'Card GiTiXi 1650', 'Card ÁrTiXi 4070', 'Card ÁrTiXi 5090'] },
  mouse: { name: 'Chuột', icon: '🖱️', bonus: 500, sat: 1, cost: [0, 40000, 100000, 220000],
           levels: ['Chuột văn phòng', 'Chuột gaming', 'Chuột siêu nhẹ', 'Chuột pro 8000Hz'] },
  kb:    { name: 'Bàn phím', icon: '⌨️', bonus: 500, sat: 1, cost: [0, 50000, 120000, 250000],
           levels: ['Phím màng', 'Phím giả cơ', 'Phím cơ RGB', 'Phím cơ custom'] },
  mon:   { name: 'Màn hình', icon: '🖥️', bonus: 1000, sat: 1.5, cost: [0, 100000, 250000, 500000],
           levels: ['Màn 19 inch mờ', 'Màn 24 inch 75Hz', 'Màn 27 inch 144Hz', 'Màn cong 240Hz'] },
  chair: { name: 'Bàn ghế', icon: '🪑', bonus: 1000, sat: 2, cost: [0, 80000, 200000, 450000],
           levels: ['Bàn ghế nhựa', 'Ghế xoay', 'Bàn ghế gaming', 'Ghế công thái học'] },
};

// ---------- Thư viện game (tên nhái cho vui) ----------
// minTier: máy yếu nhất chơi được (1 = Thường, 2 = Pre, 3 = VIP)
// cost: 0 = miễn phí, có sẵn từ đầu. pop: độ phổ biến — càng cao càng nhiều khách tìm.
// Khách máy thường chọn game minTier 1, khách máy Pre chọn game minTier 2,
// khách máy VIP chọn game minTier 2–3 (chơi max setting), streamer máy Pro Max chọn game nào cũng được.
const GAMES = {
  lmhb:    { name: 'Liên Minh Huyền Bí', icon: '⚔️', minTier: 1, cost: 0,      pop: 34 },
  pipa:    { name: 'Lét lay phút bôn',        icon: '⚽', minTier: 1, cost: 0,      pop: 24 },
  luachua: { name: 'Lửa Chùa',           icon: '🎯', minTier: 1, cost: 0,      pop: 22 },
  mairap:  { name: 'Mai Ráp',            icon: '⛏️', minTier: 1, cost: 120000, pop: 12, desc: 'Đào đất xây nhà, học sinh mê tít.' },
  rolac:   { name: 'Rô Lác',             icon: '🧱', minTier: 1, cost: 150000, pop: 12, desc: 'Cả trăm trò chơi nhỏ trong một game.' },
  cauca:   { name: 'Câu Cá Vạn Cân',     icon: '🎣', minTier: 1, cost: 80000,  pop: 8,  desc: 'Ngồi cả buổi chờ con cá vạn cân.' },
  audisan: { name: 'Nhảy Đầm',          icon: '💃', minTier: 1, cost: 60000,  pop: 6,  desc: 'Nhảy theo nhạc, bấm phím mỏi tay.' },
  valoran: { name: 'Va Lô Ran',          icon: '🔫', minTier: 2, cost: 0,      pop: 30 },
  dotkit:  { name: 'Đột Kít',            icon: '🪖', minTier: 2, cost: 0,      pop: 25 },
  coso:    { name: 'Cờ Sờ 2',            icon: '💣', minTier: 2, cost: 180000, pop: 15, desc: 'Bắn súng đặt bom huyền thoại.' },
  tromxe:  { name: 'Trộm Xe 5',          icon: '🚗', minTier: 3, cost: 250000, pop: 16, desc: 'Thế giới mở, lái xe tung tăng. Game nặng.' },
  denring: { name: 'Đen Ring',           icon: '🗡️', minTier: 3, cost: 400000, pop: 12, desc: 'Game khó, chết hoài vẫn ham. Game nặng.' },
};

const ACCOUNT_LINES = {
  calm: 'Tiền trong két chưa phải tiền tiêu được đâu chủ quán, mình còn hóa đơn đang chờ!',
  waste: 'Kỳ này nguyên liệu bỏ đi hơi xót. Nhập ít hơn, gom đồ thải thu hồi chút vốn nhé.',
  night: 'Có mở đêm thì nhớ nhìn cả tiền đèn và lương ca đêm, đừng chỉ nhìn tiền giờ.',
  loss: 'Kỳ này đang lỗ. Mình chưa phải đóng thuế, nhưng nên xem lại giá vốn và chi phí.',
  buyer: 'Chú Sáu thu gom',
  offer: 'Chú nhận hàng thu hồi và đồ hữu cơ để xử lý, không bán lại cho khách ăn uống nha.',
  raised: 'Kế toán gom đủ chứng từ, chú Sáu chịu nâng giá. Chốt được rồi đó!',
  held: 'Chú Sáu bảo: “Giá này là hết cỡ rồi cháu ơi.” Lời chào vẫn còn.',
  withdrawn: 'Chú Sáu lắc đầu rút lời chào. Ngày mai có lượt thu gom mới.',
};

// cat: base = nền tô mì, topping = cho vào tô, drink = đồ uống
// (giữ nguyên các khóa như 'sting', 'coca' để file lưu cũ vẫn đọc được)
const ITEMS = {
  mi:      { name: 'Mì Hảo Hán', icon: '🍜', cat: 'base',    pack: 10, packCost: 40000, shelf: 10, price: 12000 },
  trung:   { name: 'Trứng',      icon: '🥚', cat: 'topping', pack: 10, packCost: 30000, shelf: 3,  price: 5000 },
  xucxich: { name: 'Xúc xích',   icon: '🌭', cat: 'topping', pack: 5,  packCost: 25000, shelf: 3,  price: 8000,
             unlockCost: 150000, desc: 'Topping cho tô mì, bán thêm 8k.' },
  sting:   { name: 'Tài Lộc',    icon: '🥤', cat: 'drink',   pack: 6,  packCost: 42000, shelf: 20, price: 12000 },
  suoi:    { name: 'Nước suối',  icon: '💧', cat: 'drink',   pack: 6,  packCost: 24000, shelf: 30, price: 8000 },
  coca:    { name: 'Trâu Húc',   icon: '🐃', cat: 'drink',   pack: 6,  packCost: 48000, shelf: 20, price: 15000,
             unlockCost: 100000, desc: 'Nước tăng lực cho dân cày rank đêm, bán 15k.' },
  caphe:   { name: 'Cà phê sữa', icon: '☕', cat: 'drink',   pack: 10, packCost: 50000, shelf: 15, price: 18000,
             unlockCost: 200000, desc: 'Phải rót sữa đúng vạch. Bán 18k.' },
};

// Nâng cấp cả quán (máy & linh kiện nằm ở khung "Dàn máy")
const UPGRADES = [
  { id: 'ac',       icon: '❄️', name: 'Lắp điều hòa',       desc: 'Bật/tắt trong giờ mở cửa. Phòng mát: khách chịu chờ lâu hơn 35%, máy ít treo. Tốn điện.', cost: 400000, once: true },
  { id: 'inverter', icon: '🌀', name: 'Máy lạnh Inverter',  desc: 'Điều hòa tốn ít hơn 40% tiền điện.', cost: 250000, once: true, needs: 'ac' },
  { id: 'ups',      icon: '🔋', name: 'Bộ lưu điện UPS',    desc: 'Máy ít bị treo hơn một nửa. Cúp điện thì khách kịp lưu game, không mất trận.', cost: 350000, once: true },
  { id: 'headphone', icon: '🎧', name: 'Tai nghe chống ồn', desc: 'Khách ồn ào hát hò thì khách ngồi cạnh đỡ khó chịu hơn hẳn.', cost: 250000, once: true },
  { id: 'camera',   icon: '📹', name: 'Camera an ninh',     desc: 'Kẻ trộm lộ mặt 👀 ngay khi vào quán, có thêm 2 giây để bắt, trộm cũng ngại ghé hơn.', cost: 300000, once: true },
  { id: 'cablelock', icon: '🔒', name: 'Khóa cáp chuột phím', desc: 'Kẻ trộm không gỡ được chuột và bàn phím.', cost: 120000, once: true },
  { id: 'gen',      icon: '🛢️', name: 'Máy phát điện',    desc: 'Cúp điện vẫn mở máy được, nhưng tốn tiền xăng.', cost: 600000, once: true },
];
// Tệp khách nào hay đập phím khi thua (nhân với SMASH_PER_HOUR; không ghi = 1)
const SMASH_MUL = { rank: 3, streamer: 1.5, hoainiem: 1.2, vanphong: 0.3, gioi: 0.5, hocsinh: 1.3, congan: 0.3 };

// Gói mạng: cap = số máy chạy cùng lúc mà không giật; daily = tiền mạng mỗi ngày
const NET_PLANS = [
  { id: 'home',  icon: '🏠', name: 'Gói gia đình',     cap: 4,  daily: 0,     cost: 0 },
  { id: 'fiber', icon: '📶', name: 'Gói cáp quang',    cap: 8,  daily: 20000, cost: 100000 },
  { id: 'biz',   icon: '🏢', name: 'Gói doanh nghiệp', cap: 12, daily: 45000, cost: 250000 },
];
// Tên & ảnh đại diện tách theo giới tính để tên nam luôn đi với hình nam, tên nữ với hình nữ.
// (Mỗi tệp khách trong SEGMENTS cũng có names = tên nam, namesNu = tên nữ, girlRate = tỉ lệ khách nữ.)
const CUSTOMER_NAMES = [
  'Tuấn Khỉ', 'Minh Béo', 'Quang Hùng má xa đê', 'Cu Tí', 'Cu Tèo', 'Khoa', 'Nam', 'Phong',
  'Huy', 'Dũng Pro', 'Huấn râu xi', 'Giang đẫm', 'G dragon', 'Bin', 'Sơn', 'Kiệt Lặc',
  'Tâm Mập', 'Hiếu Còi', 'Bảo Ngáo', 'Lộc Lém', 'Tín Ú', 'Quý Sún', 'Thịnh Lươn', 'Toàn Tồ', 'Đạt Đen',
  'Hùng Xoăn', 'Vinh Vịt', 'Thắng Thọt', 'Lâm Lì', 'Phát Phệ', 'Trí Tò Mò',
];
const CUSTOMER_NAMES_NU = [
  'Bé Na', 'Linh Thộn', 'Vy', 'Trâm', 'Mai', 'Cô giáo Thảo', 'Nhi Nhí', 'Uyên Ương', 'Ngân Ngơ',
  'Hằng Hến', 'Thảo Mai', 'Lan Lùn', 'Hương Ham Hố', 'My Mít', 'Ly Lém', 'Diễm Đanh Đá', 'Thu Tròn',
  'Yến Ỉn', 'Quỳnh Quậy', 'Hạnh Hóng Hớt', 'Trang Tròn', 'Oanh Óng Ánh',
];
const CUSTOMER_AVATARS = ['🧑', '👦', '🧔', '👨', '👱‍♂️', '👨‍🦱'];
const CUSTOMER_AVATARS_NU = ['👧', '👩', '👩‍🦰', '👱‍♀️', '👩‍🦱'];
// t = loại máy, h = số giờ, g = tên game
const CUSTOMER_LINES = [
  (t, h, g) => `Anh ơi, cho em ${t} ${h}, chơi ${g}!`,
  (t, h, g) => `Chủ quán ơi, ${t} ${h} nhé, em cày ${g}.`,
  (t, h, g) => `Mở giùm em ${t}, ${h} thôi. Vào ${g} liền!`,
  (t, h, g) => `Còn ${t} không? Em chơi ${g} ${h}.`,
  (t, h, g) => `Cho em ${t} ${h}, em với hội bạn hẹn nhau vào ${g}.`,
];
const STREAM_LINES = [
  (h, g) => `Em stream ${g} ${h}, cho máy Pro Max nha!`,
  (h, g) => `Máy Pro Max ${h} anh ơi, tối nay live ${g}.`,
];
// Khách hỏi game quán chưa cài
const LOST_LINES = [
  g => `Quán có ${g} không anh?`,
  g => `Ủa, không có ${g} hả? Thôi em đi quán khác.`,
  g => `Anh ơi cài ${g} chưa? Chưa hả…`,
];
// Kẻ trộm: nói lấp lửng, nạp ít giờ, thích ngồi góc (người tinh ý sẽ thấy lạ)
const THIEF_LINES = [
  (t, h) => `Cho anh ${t}… ${h} thôi. Máy nào ở góc ấy.`,
  (t, h) => `Ờ… ${t} ${h}. Chơi gì cũng được.`,
  (t, h) => `${t} ${h}, máy nào khuất khuất chút nha em.`,
];

// Khách xin bao đêm (t = loại máy, g = tên game)
const OVERNIGHT_LINES = [
  (t, g) => `Anh ơi cho em bao đêm ${t}, cày ${g} tới sáng!`,
  (t, g) => `Bao đêm ${t} bao nhiêu anh? Tối nay em thức chơi ${g}.`,
  (t, g) => `Cho em gói bao đêm nha, ${t}, em leo ${g} xuyên đêm.`,
];

// ---------- Tên quán gợi ý (nút 🎲) ----------
const SHOP_NAME_IDEAS = [
  'Net Tèo', 'Hang Ổ Game Thủ', 'Net Cô Ba', 'Net 24h Không Ngủ', 'Tiệm Net Mì Tôm',
  'Net Huyền Thoại', 'Cyber Hảo Hán', 'Net Leo Rank', 'Quán Net Trốn Học', 'Net Mạng Căng',
  'Net Bất Ổn', 'Trạm Sạc Game Thủ',
];

// ---------- Review Google Maps ----------
// Mỗi nhóm là một sự việc xảy ra trong lúc khách ở quán. {game} {pc} {shop} sẽ được thay chữ.
// Đây cũng là giọng "vui" (hài hước); giọng thẳng thắn / nhẹ nhàng nằm ở VOICE_LINES bên dưới.

const REVIEW_LINES = {
  rage: [
    'Máy {pc} treo cứng ngắc, gọi mỏi miệng không ai sửa. Về luôn cho lành.',
    'Đang combat thì màn hình đứng hình. Chủ quán đi đâu mất tiêu vậy?',
  ],
  broken: [
    'Đang chơi {game} tới khúc gay cấn thì máy treo. Mất trận, tức!',
    'Máy {pc} treo giữa chừng. Máy quán hay máy nhà ông bà vậy?',
  ],
  lag: [
    'Kêu máy xịn mà cho ngồi máy cùi, chơi {game} giật như chiếu slide.',
    'FPS còn thấp hơn điểm thi của mình. Không quay lại.',
    'Bắn trúng đầu mà game không nhận. Máy lag quá trời.',
  ],
  dirty: [
    'Bàn còn nguyên tô mì của người trước, ruồi bay vo ve.',
    'Bàn phím dính nước ngọt, bấm phím nào cũng kêu chẹp chẹp.',
  ],
  short: [
    'Nạp thiếu giờ, đang chơi dở thì máy tắt cái phụt.',
    'Bảo nạp 2 tiếng mà được có hơn tiếng. Chủ quán học toán ở đâu vậy?',
  ],
  wait: [
    'Đứng ở cửa mòn cả dép mới được xếp máy.',
    'Chờ lâu quá, tới lúc được ngồi thì hết hứng chơi luôn.',
  ],
  walkout: [
    'Đứng chờ mãi không ai tiếp, bỏ sang quán bên cạnh.',
    'Vào quán như người vô hình. Không ai thèm nhìn.',
    'Xếp hàng lâu hơn xếp hàng mua vé concert.',
  ],
  foodslow: [
    'Gọi mì từ lúc mới vào, chơi xong vẫn chưa thấy mì đâu.',
    'Gọi ly nước mà chờ lâu như chờ người yêu cũ quay lại.',
  ],
  outofstock: [
    'Gọi món nào cũng hết. Quán net hay quán bán không khí?',
  ],
  missing: [
    'Gọi 2 món mang ra 1 món. Món còn lại chắc đi lạc.',
    'Mang đồ ra thiếu trước hụt sau. Nhớ ghi order giùm cái.',
  ],
  raw: [
    'Mì còn sống nhăn, nhai rôm rốp như ăn snack.',
  ],
  mushy: [
    'Mì nấu nát như cháo, phải ăn bằng muỗng.',
  ],
  coffee: [
    'Ly cà phê pha kiểu gì uống như nước rửa ly.',
    'Cà phê rót tràn ly, dính hết cả chuột.',
  ],
  sick: [
    'Ăn ở quán xong về đau bụng cả đêm. Bán đồ hết date à?',
    'Uống xong chạy vô toilet 5 lần. Cảnh báo mọi người!',
    'Đồ ăn có vấn đề, mình bị ngộ độc nhẹ. 1 sao không hơn.',
  ],
  nogame: [
    'Hỏi có {game} không, chủ quán lắc đầu. Quán net gì kỳ vậy?',
    'Tới nơi mới biết quán chưa cài {game}. Đi bộ về mỏi chân.',
    'Quán nhìn cũng được mà thiếu {game}. Cài thêm đi chủ ơi!',
  ],
  hotgame: [
    '{game} đang hot mà quán có sẵn, vào là chơi liền. Quá đã!',
    'Cả trường đang chơi {game}, may mà quán có cài.',
  ],
  closed: [
    'Đang chơi ngon thì quán đóng cửa cái rụp. Trả lại tiền thì cũng mất hứng.',
  ],
  bad: [
    'Trải nghiệm không vui lắm. Chắc không quay lại.',
    'Tệ. Mà tệ theo kiểu khó diễn tả.',
  ],
  meh: [
    'Cũng tạm, không có gì đặc biệt.',
    'Máy chạy được, đồ ăn ăn được. Vậy thôi.',
    'Ổn áp, nhưng còn vài chỗ cần cải thiện.',
  ],
  tasty: [
    'Tô Mì Hảo Hán nấu chuẩn không cần chỉnh. Đỉnh!',
    'Mì ngon hơn mẹ nấu (đừng nói với mẹ nha).',
    'Đồ ăn ra nhanh, nóng hổi, 10 điểm.',
  ],
  quick: [
    'Gọi nước là có liền, phục vụ nhanh như chớp.',
    'Nước mát lạnh, mang ra tận bàn. Chủ quán có tâm.',
  ],
  perfect: [
    'Nạp giờ chuẩn từng phút, chủ quán tay nghề cao.',
    'Phục vụ nhanh gọn lẹ, vào là có máy chơi liền.',
  ],
  bonus: [
    'Chủ quán nạp dư giờ cho, tốt bụng ghê!',
  ],
  fancy: [
    'Kêu máy thường mà được ngồi máy xịn, chơi {game} mượt như bơ.',
  ],
  chair: [
    'Ghế êm quá, ngồi chơi mà suýt ngủ quên.',
    'Ngồi cả buổi không mỏi lưng, bàn ghế xịn thật sự.',
  ],
  gear: [
    'Chuột nhẹ, phím cơ gõ đã tay, màn hình mượt. Máy {pc} đỉnh của chóp!',
    'Gear ở đây xịn hơn gear ở nhà mình. Chơi {game} sướng tay.',
  ],
  ac: [
    'Điều hòa mát rượi, trốn nóng ở đây là chuẩn bài.',
    'Ngoài trời nắng cháy da mà trong quán mát như Đà Lạt.',
  ],
  ping: [
    'Ping nhảy lên ba chữ số, bắn phát nào trượt phát đó.',
    'Quán đông cái là mạng giật tung chảo. Nâng cấp mạng đi chủ ơi!',
  ],
  hot: [
    'Trong quán nóng như lò bánh mì, mồ hôi chảy ướt cả bàn phím.',
    'Không bật điều hòa hả chủ? Chơi {game} mà như xông hơi.',
  ],
  outage: [
    'Đang ăn trận thì cúp điện cái rụp, mất trắng. Quán không có UPS à?',
    'Cúp điện giữa ván {game}, chưa kịp lưu gì hết. Buồn.',
  ],
  dark: [
    'Cúp điện ngồi chờ trong bóng tối cả buổi, không ai nói gì.',
    'Mất điện mà quán không có máy phát, ngồi nhìn màn hình đen thui.',
  ],
  worn: [
    'Bàn phím máy {pc} liệt mấy nút, bấm chiêu không ra.',
    'Chuột double click loạn xạ, phím W thì kẹt. Thay đồ mới đi quán ơi.',
  ],
  noise: [
    'Máy bên cạnh hát karaoke nguyên buổi, chủ quán không nói câu nào.',
    'Ngồi cạnh một ca sĩ không ai mời. Tai mình xin nghỉ phép.',
    'Đứa bên cạnh la hét như đang đi bão. Mua tai nghe chống ồn đi quán ơi.',
  ],
  hushed: [
    'Có đứa la hét, chủ quán ra nhắc liền. Ngồi chơi yên tâm.',
  ],
  kicked: [
    'Đang vui có tí mà bị mời về. Quán gì khó tính dữ.',
    'Hát có xíu mà bị đuổi. Không quay lại nữa.',
  ],
  momhid: [
    'Mẹ tới tận cửa mà anh chủ quán giấu giùm, cứu em một mạng!',
    'Chủ quán nói dối mẹ em đỉnh hơn diễn viên. Quán uy tín.',
  ],
  momcaught: [
    'Anh chủ có giấu giùm mà vẫn bị mẹ tóm. Dù sao cũng cảm ơn anh.',
  ],
  mompointed: [
    'Mẹ vừa hỏi một câu là chủ quán chỉ chỗ liền. Phản bội!',
    'Bị chủ quán khai ra với mẹ, về nhà ăn roi. Không bao giờ quay lại.',
  ],
  good: [
    'Quán sạch, máy mượt, chủ quán dễ thương. Sẽ quay lại!',
    'Chơi {game} ở {shop} là số một.',
    'Không có gì để chê. 10 điểm không có nhưng.',
  ],
  quickseat: [
    'Vừa bước vô là có máy, nhanh hơn người yêu cũ trả lời tin nhắn.',
    'Không phải đứng chờ giây nào. Quá đã!',
  ],
  cleanseat: [
    'Bàn sạch tới mức soi gương được. Ưng!',
  ],
  fixed: [
    'Máy treo cái là chủ quán lao tới như siêu nhân. Sửa xong vào lại kịp trận.',
  ],
  favpc: [
    'Máy {pc} như máy nhà mình vậy, chủ quán nhớ luôn. Ưng!',
  ],
  asked: [
    'Chủ quán hỏi đúng lúc mình đang thèm mì mà ngại gọi. Đọc được suy nghĩ luôn hả?',
  ],
  pester: [
    'Chủ quán hỏi thăm nhiều hơn mẹ mình gọi điện. Cho em chơi yên với!',
  ],
  shyskip: [
    'Khát khô cổ mà ngại gọi. Lần sau chắc mang nước theo.',
  ],
};

// =====================================================================
//  TỆP KHÁCH · TÍNH CÁCH · GIỌNG NÓI
// =====================================================================
// Ba lớp tách riêng:
//  • Tệp khách: khách coi trọng điều gì (care) và hay tới giờ nào (when).
//  • Tính cách: đổi cách phải phục vụ (chờ ngắn hơn, ngại bàn bẩn…).
//  • Giọng nói: chỉ đổi cách diễn đạt nhận xét, không đổi điểm.
//
// Mặt dịch vụ (aspect): wait = chờ xếp máy · clean = bàn sạch · hours = nạp giờ
//                       food = đồ ăn uống · pc = máy chạy ổn · quiet = yên tĩnh (khách cạnh bên ồn)
// Điểm hài lòng của một sự việc = mức ảnh hưởng × care của tệp khách × hệ số tính cách.

// base  = trọng số ngoài các khung giờ; when = [[từ giờ, đến giờ, trọng số], …]
// weekend = khung giờ cộng thêm vào Thứ 7, Chủ nhật · kid = học sinh (vắng vào tuần thi)
// tiers = hạng máy tệp này hay thuê · hours = số giờ hay nạp · games = game ưa chuộng
// order = thói quen gọi đồ · traits = tính cách hay gặp (nhân trọng số) · voice = giọng hay dùng
// lines = câu nhận xét riêng cho 2–3 sự việc quan trọng nhất với tệp này
const SEGMENTS = {
  vanglai: {
    name: 'Khách vãng lai', short: 'khách vãng lai', base: 1, tiers: [1, 2, 3], care: {},
  },
  vanphong: {
    name: 'Nhân viên văn phòng', short: 'dân văn phòng', base: 0, when: [[11, 13.5, 2.2], [17, 19, 0.5]],
    tiers: [1, 2], hours: [1, 1, 1.5], care: { wait: 1.5, food: 1.4, clean: 1.2, quiet: 1.5 },
    order: { chance: 0.85, early: true, drinkOnly: true, drinks: ['caphe', 'sting'] },
    traits: { voi: 2, onao: 0.3 },
    girlRate: 0.5, avatars: ['👨‍💼'], avatarsNu: ['👩‍💼'],
    names: ['Anh Tùng IT', 'Anh Bảo sale', 'Anh Long kho vận', 'Anh Phong kỹ sư', 'Anh Đức thiết kế', 'Anh Khánh kế toán'],
    namesNu: ['Chị Hạnh kế toán', 'Chị Ngọc nhân sự', 'Chị Thư lễ tân', 'Chị Mai marketing', 'Chị Lan hành chính', 'Chị Vân thu ngân'],
    requests: [
      (t, h, g) => `Cho mình ${t} ${h} thôi, tranh thủ làm ván ${g} rồi còn đi.`,
      (t, h, g) => `Anh ơi, ${t} ${h} nhé, tranh thủ chút thời gian rảnh chơi ${g}.`,
    ],
    lines: {
      wait: ['Tranh thủ có chút thời gian rảnh mà đứng chờ máy gần hết.'],
      foodslow: ['Cà phê ngon nhưng ra hơi muộn, chưa kịp uống đã phải đi.'],
      quickseat: ['Vào là có máy, gọi nước là có. Tranh thủ vậy mới đáng.'],
      quick: ['Nước ra nhanh, gọn gàng. Mai ghé tiếp.'],
    },
    hints: { wait: 'Dân văn phòng chỉ có ít thời gian (trưa và chiều tan làm): chừa sẵn máy trống, làm đồ uống cho họ trước.' },
  },
  hocsinh: {
    name: 'Học sinh tan học', short: 'học sinh', kid: true, base: 0.1,
    when: [[11, 13, 1.4], [16.5, 19, 1.8], [19, 22, 0.5]], weekend: [[8, 12, 1.2]],
    tiers: [1], hours: [1, 1, 1.5, 2], care: { hours: 1.2, food: 1.1, wait: 0.9 },
    games: ['lmhb', 'pipa', 'luachua', 'mairap', 'rolac'],
    order: { chance: 0.7, food: true, drinks: ['coca', 'sting'] },
    traits: { onao: 2.5 },
    girlRate: 0.4, avatars: ['👦', '🧒'], avatarsNu: ['👧'],
    names: ['Tí lớp 6', 'Bi lớp 8', 'Tèo lớp 7', 'Bin lớp 10', 'Cún lớp 6', 'Tũn lớp 9', 'Tồ lớp 8', 'Bờm lớp 7'],
    namesNu: ['Na lớp 8', 'Su lớp 9', 'Mít lớp 7', 'Bống lớp 11', 'Thỏ lớp 6', 'Nhím lớp 8'],
    requests: [
      (t, h, g) => `Anh ơi ${t} ${h}, tan học rồi làm ván ${g} đã!`,
      (t, h, g) => `Cho em ${t} ${h} nha, em chơi ${g} với tụi bạn.`,
      (t, h, g) => `Em gom đủ tiền rồi nè, ${t} ${h} chơi ${g} anh ơi!`,
      (t, h, g) => `${t} ${h} anh ơi, lẹ lẹ không đứa kia vào ${g} trước.`,
      (t, h, g) => `Em trốn học thêm… à không, em được nghỉ. Cho ${t} ${h} chơi ${g}!`,
      (t, h, g) => `Cho em ${t} ${h}, còn tiền dư em mua mì nha.`,
    ],
    lines: {
      short: ['Em đếm từng phút mà máy tắt sớm. Phí tiền ăn sáng của em.'],
      tasty: ['Mì trứng ngon xỉu, tan học ra làm tô là hết mệt.'],
      quickseat: ['Vào cái là có máy, kịp vào trận với tụi bạn luôn.'],
    },
    hints: { short: 'Học sinh ít tiền nên rất để ý giờ nạp: nạp đúng vạch vàng.' },
  },
  gioi: {
    name: 'Học sinh giỏi vượt khó', short: 'học sinh', kid: true, base: 0.15, when: [[14, 18, 0.8]],
    tiers: [1], hours: [1, 1, 1.5], care: { hours: 1.6, wait: 0.8, food: 0.8 },
    order: { chance: 0.25, drinks: ['suoi'] },
    traits: { tietkiem: 2, onao: 0.2 }, voice: 'nhe',
    girlRate: 0.5, avatars: ['👨‍🎓'], avatarsNu: ['👩‍🎓'],
    names: ['Nhật lớp 11', 'Khang lớp 12', 'Tuấn lớp 10', 'Quân chuyên Lý', 'Bảo chuyên Tin', 'Hiển lớp 9'],
    namesNu: ['Bé An lớp 9', 'Hà Vy chuyên Toán', 'Bé Thảo lớp 8', 'Minh Thư chuyên Văn', 'Bé Ngọc lớp 7', 'Châu lớp 11'],
    requests: [
      (t, h, g) => `Dạ cho em ${t} ${h} thôi ạ, em chơi ${g} xíu rồi về học.`,
      (t, h, g) => `Em có ít tiền thôi, cho em ${t} ${h} chơi ${g} ạ.`,
    ],
    lines: {
      perfect: ['Anh chị nạp đúng giờ, em không bị tốn thêm đồng nào. Em cảm ơn ạ.'],
      short: ['Em trả đủ tiền mà chưa hết ván máy đã tắt. Em hơi buồn ạ.'],
      bonus: ['Em cảm ơn vì được thêm giờ ạ. Lần sau em lại ghé.'],
    },
  },
  rank: {
    name: 'Game thủ đi rank', short: 'game thủ rank', base: 0.3, when: [[18, 22, 1.4], [13, 18, 0.6], [22, 27, 1.2]],
    tiers: [1, 2, 3], hours: [2, 3, 3, 4], care: { pc: 1.7, wait: 0.9 },
    games: ['lmhb', 'valoran', 'coso', 'dotkit'],
    order: { chance: 0.75, drinks: ['coca', 'sting'] },
    traits: { kytinh: 1.5, onao: 1.5 }, voice: 'thang',
    girlRate: 0.25, avatars: ['👨‍💻', '🧑‍💻'], avatarsNu: ['👩‍💻'],
    names: ['Tùng Cao Thủ', 'Duy Leo Rank', 'Hải Thách Đấu', 'Phúc Kim Cương', 'Long Gánh Team',
      'Khôi Cao Thủ', 'Nam Bạch Kim', 'Tài Rừng Rú', 'Vũ Một Mạng', 'Sang Cao Thủ', 'Kha Leo Rank', 'Thành Gánh Team'],
    namesNu: ['Linh Leo Rank', 'Trang Bạch Kim', 'Vy Một Mạng', 'Ngọc Thách Đấu', 'Hà Kim Cương', 'Thư Gánh Team'],
    requests: [
      (t, h, g) => `Cho em ${t} ${h}, em leo rank ${g}, máy ngon giùm em.`,
      (t, h, g) => `Anh ơi ${t} ${h}, tối nay phải lên hạng ${g}!`,
    ],
    lines: {
      broken: ['Máy ngon. Nhưng đúng lúc combat thì treo, hơi rén vào trận tiếp.'],
      fixed: ['Máy treo một phát mà chủ quán sửa lẹ, kịp vào lại trận. Uy tín.'],
      lag: ['Leo rank mà máy giật thế này thì tụt rank chứ leo gì.'],
      gear: ['Chuột nhạy, màn mượt, leo liền hai bậc. Mai cày tiếp.'],
    },
    hints: { broken: 'Game thủ đi rank rất ngại máy treo: sửa ngay, và cân nhắc mua UPS.' },
  },
  hoainiem: {
    name: 'Game thủ hoài niệm', short: 'game thủ hoài niệm', base: 0.15, when: [[19, 22, 0.6], [8, 11, 0.35], [22, 25, 0.5]],
    tiers: [1, 2], hours: [2, 2.5, 3], care: { food: 1.2 },
    games: ['dotkit', 'audisan', 'cauca', 'coso'],
    order: { chance: 0.8, food: true, toppings: ['trung'], drinks: ['suoi', 'sting'] },
    girlRate: 0.2, avatars: ['🧔', '👨‍🦳', '🧔‍♂️'], avatarsNu: ['👩', '👩‍🦳'],
    names: ['Chú Tư', 'Anh Hòa 8x', 'Anh Sang 9x', 'Chú Bảy', 'Anh Thắng Kít',
      'Anh Lực 8x', 'Chú Sáu', 'Anh Quyết 9x', 'Anh Hậu Đầm'],
    namesNu: ['Chị Duyên 9x', 'Cô Hoa 8x', 'Chị Thắm Nhảy Đầm', 'Cô Năm'],
    requests: [
      (t, h, g) => `Quán còn ${g} không? Cho mình ${t} ${h}, chơi lại cho nhớ.`,
      (t, h, g) => `Mở ${t} ${h} nhé, lâu rồi chưa đụng tới ${g}.`,
    ],
    lines: {
      oldgame: ['Cuối cùng cũng tìm được quán có {game}. Cuối tuần để tôi rủ mấy người bạn cũ qua.'],
      nogame: ['Hỏi {game} mà quán không có. Giờ chẳng mấy quán giữ game cũ.'],
      tasty: ['Tô mì trứng y như hồi xưa ngồi net. Nhớ ghê.'],
    },
    hints: { nogame: 'Khách hoài niệm tìm game cũ: xem Thư viện game buổi sáng.' },
  },
  congan: {
    name: 'Công an mê game', short: 'anh công an', base: 0, when: [[17.5, 21, 0.3]], maxPerDay: 1,
    tiers: [1, 2, 3], hours: [1.5, 2, 2.5], care: {}, voice: 'thang',
    girlRate: 0, avatars: ['👮‍♂️'],   // câu thoại xưng "anh" nên tệp này chỉ có khách nam
    names: ['Anh Toàn (công an phường)', 'Anh Khải (công an phường)'],
    requests: [
      (t, h, g) => `Anh hết ca rồi, cho anh ${t} ${h}, làm vài ván ${g}.`,
      (t, h, g) => `Không phải kiểm tra đâu, anh ra chơi ${g} thôi. Cho anh ${t} ${h} nhé.`,
    ],
    lines: {
      good: ['Anh ra chơi hết ca thôi, mọi người cứ tự nhiên. Quán ổn.'],
      broken: ['Máy số {pc} treo giữa ván, chủ quán kiểm tra lại giùm nhé.'],
      dirty: ['Bàn chưa lau, chủ quán chú ý vệ sinh chút nhé.'],
    },
  },
  streamer: {
    name: 'Streamer', short: 'streamer', base: 1, tiers: [4], care: { pc: 1.8 },
    girlRate: 0.5, avatars: ['👨‍🎤'], avatarsNu: ['👩‍🎤'],
    names: ['Streamer Tí Đỏ', 'Streamer Gà Mờ', 'Streamer Khoai Lang', 'Streamer Bò Bía'],
    namesNu: ['Streamer Mèo Béo', 'Streamer Bé Cam', 'Streamer Thỏ Ngọc', 'Streamer Mây Mây'],
    lines: {
      broken: ['Đang live thì máy treo, người xem tưởng mình out stream luôn.'],
      gear: ['Máy chạy mượt, stream không tụt khung hình nào. Góc quay cũng đẹp.'],
      fixed: ['Máy treo một chút nhưng chủ quán hỗ trợ nhanh, live vẫn trơn tru.'],
    },
  },
};

// weight = độ phổ biến · patience = hệ số thời gian chịu chờ (ở cửa & chờ món)
// bad/good = hệ số nhân điểm trừ/cộng theo mặt dịch vụ · noticeClean = để ý khi được ngồi bàn sạch
// greet = câu chào ở cửa, để người chơi nhận ra tính cách ngay lần đầu gặp
// icon hiện cạnh avatar khi khách đã thành khách quen (khách lạ chỉ lộ tính cách qua câu chào)
// shy = rụt rè: ở cửa chưa dám nói yêu cầu; gọi món thì bong bóng thu lại thành 💭 cho tới khi được hỏi
const TRAITS = {
  thuong: { name: '', weight: 2 },
  voi: {
    name: 'Nóng vội', icon: '⏱️', weight: 1, patience: 0.75, voice: 'thang',
    greet: ['Mình đang vội nhé!', 'Lẹ giùm em nha, em ghé có chút xíu.', 'Em không chờ lâu được đâu nha.'],
  },
  kytinh: {
    name: 'Kỹ tính', icon: '🔍', weight: 1, bad: { clean: 1.5, pc: 1.5, quiet: 1.5 }, noticeClean: true,
    greet: ['Cho em chỗ sạch sẽ chút nha.', 'Bàn ghế lau chưa anh? Em ngại bẩn lắm.', 'Máy nào chạy ổn định thì cho em nha.'],
  },
  tietkiem: {
    name: 'Tiết kiệm', icon: '💰', weight: 1, bad: { hours: 1.6 }, good: { hours: 1.5 },
    greet: ['Nạp đúng giờ giùm em nha, em tính kỹ lắm.', 'Đúng số giờ đó thôi nha, dư thiếu gì em biết liền.'],
  },
  rutre: {
    name: 'Rụt rè', icon: '😶', weight: 1, shy: true, voice: 'nhe',
    greet: ['Dạ… cho em hỏi…', 'Ờm… anh ơi… (nói nhỏ xíu)', 'Dạ, em… em muốn chơi máy ạ.'],
  },
  onao: {
    name: 'Ồn ào', icon: '📢', weight: 0.5, noisy: true, voice: 'vui',
    greet: ['Ê quán ơiii! Mở nhạc to lên coi!', 'Hú hú, tới rồi nè anh em ơi!', 'Quán có karaoke không anh? Đùa thôi hehe.'],
  },
};

// Giọng "vui" dùng REVIEW_LINES ở trên; hai giọng còn lại viết riêng cho các sự việc chính.
const VOICES = ['thang', 'nhe', 'vui'];
const VOICE_LINES = {
  thang: {
    quickseat: ['Vào là có máy ngay. Tốt.'],
    wait: ['Chờ máy quá lâu. Quán cần xếp khách nhanh hơn.'],
    walkout: ['Đứng chờ mãi không ai xếp máy. Bỏ về.'],
    dirty: ['Bàn bẩn, còn đồ ăn của người trước. Dọn rồi hẵng xếp khách.'],
    cleanseat: ['Bàn ghế sạch, bàn phím không dính. Được.'],
    perfect: ['Nạp đúng giờ, không thiếu phút nào. Chuẩn.'],
    short: ['Nạp thiếu giờ, đang chơi thì máy tắt. Không chấp nhận được.'],
    bonus: ['Nạp dư cho mấy phút. Chủ quán hào phóng.'],
    quick: ['Gọi nước là có liền. Nhanh.'],
    tasty: ['Mì chín vừa, đúng món. Không có gì để chê.'],
    foodslow: ['Gọi món chờ quá lâu. Cần làm nhanh hơn.'],
    broken: ['Máy treo giữa trận, chờ mãi mới có người sửa.'],
    fixed: ['Máy có treo một lần, nhưng sửa ngay. Chấp nhận được.'],
    rage: ['Máy treo cứng, gọi không ai sửa. Về luôn.'],
    lag: ['Máy yếu, chơi {game} giật. Xếp sai máy rồi.'],
    favpc: ['Chủ quán nhớ máy quen của mình. Được.'],
    asked: ['Chủ quán có để ý tới khách. Tốt.'],
    pester: ['Đang chơi mà bị hỏi tới hỏi lui, mất tập trung.'],
    noise: ['Máy bên cạnh ồn ào cả buổi. Quán cần nhắc khách.'],
    hushed: ['Có khách ồn, quán nhắc ngay. Tốt.'],
    shyskip: ['Muốn gọi đồ mà chẳng ai hỏi.'],
    good: ['Máy ổn, phục vụ ổn. Sẽ quay lại.'],
    meh: ['Tạm được. Còn vài chỗ cần sửa.'],
    bad: ['Không hài lòng. Không quay lại.'],
  },
  nhe: {
    quickseat: ['Mình vừa tới là có máy liền, cảm ơn quán ạ.'],
    wait: ['Mình đợi hơi lâu mới có máy, chắc hôm nay quán đông ạ.'],
    walkout: ['Mình đứng đợi một lúc không thấy ai, nên xin phép về trước ạ.'],
    dirty: ['Bàn còn hơi bừa một chút, lần sau quán lau giúp mình trước nhé.'],
    cleanseat: ['Bàn ghế sạch sẽ, ngồi thấy dễ chịu lắm ạ.'],
    perfect: ['Chủ quán nạp đúng giờ, mình yên tâm lắm.'],
    short: ['Hình như giờ nạp hơi thiếu, mình chưa chơi xong thì máy tắt ạ.'],
    bonus: ['Quán còn cho thêm ít giờ, mình cảm ơn nhiều ạ.'],
    quick: ['Nước mang ra nhanh lắm, cảm ơn quán.'],
    tasty: ['Tô mì vừa miệng, nóng hổi. Cảm ơn chủ quán ạ.'],
    foodslow: ['Món ra hơi chậm một chút, chắc quán bận ạ.'],
    broken: ['Máy bị treo một lúc, mình đợi hơi lâu mới được sửa ạ.'],
    fixed: ['Máy có treo một lần, được chủ quán sửa ngay nên vẫn ổn ạ.'],
    rage: ['Máy treo lâu quá, mình xin phép về trước ạ.'],
    lag: ['Máy hơi yếu với {game}, lần sau mình xin máy khỏe hơn ạ.'],
    favpc: ['Quán còn nhớ máy quen của mình, vui ghê ạ.'],
    asked: ['Chủ quán hỏi han nhẹ nhàng nên mình mới dám gọi món. Cảm ơn ạ.'],
    pester: ['Chủ quán hỏi thăm hơi nhiều, mình đang chơi nên hơi rối ạ.'],
    noise: ['Bạn ngồi cạnh hơi ồn, mình khó tập trung một chút ạ.'],
    hushed: ['Có bạn hơi ồn nhưng quán nhắc nhẹ nhàng ngay, cảm ơn quán ạ.'],
    shyskip: ['Mình định gọi nước mà ngại quá, thôi ạ.'],
    good: ['Mọi thứ đều ổn, cảm ơn quán nhiều ạ.'],
    meh: ['Cũng ổn ạ, có vài chỗ nhỏ thôi.'],
    bad: ['Hôm nay chưa được như mong đợi lắm ạ.'],
  },
};

// Vế câu ngắn cho từng sự việc: dùng để ghép "X, nhưng Y." và gom trên bảng cuối ngày
const CLAUSES = {
  ping: 'mạng giật, ping cao', hot: 'quán nóng như lò', ac: 'quán mát rượi',
  outage: 'cúp điện mất trận đang chơi', dark: 'cúp điện ngồi chờ mãi', worn: 'phím chuột liệt nút',
  quickseat: 'được xếp máy ngay', wait: 'phải chờ máy khá lâu', walkout: 'chờ ở cửa quá lâu',
  dirty: 'bàn còn bẩn', cleanseat: 'bàn ghế sạch sẽ',
  perfect: 'nạp giờ chuẩn', short: 'bị nạp thiếu giờ', bonus: 'được tặng thêm giờ', closed: 'chưa hết giờ quán đã đóng cửa', overnight: 'được bao đêm giá hời',
  quick: 'nước ra nhanh', tasty: 'đồ ăn ngon, ra đúng món', foodslow: 'món ra chậm', missing: 'mang món ra thiếu', orderwrong: 'nhân viên ghi sai món',
  raw: 'mì còn sống', mushy: 'mì nấu nát', coffee: 'cà phê rót chưa chuẩn', outofstock: 'gọi món thì hết hàng',
  sick: 'bị đau bụng vì đồ ăn',
  broken: 'máy treo lâu mới được sửa', fixed: 'máy treo được sửa ngay', rage: 'máy treo không ai sửa',
  lag: 'máy yếu hơn yêu cầu', fancy: 'được ngồi máy xịn hơn', gear: 'gear xịn', chair: 'ghế ngồi êm',
  hotgame: 'quán có game đang hot', oldgame: 'quán còn giữ game cũ',
  favpc: 'được ngồi đúng máy quen', asked: 'được chủ quán hỏi han', pester: 'bị hỏi han nhiều lúc đang chơi',
  better: 'thấy quán đã khắc phục chuyện lần trước', again: 'gặp lại đúng lỗi lần trước',
  noise: 'máy bên cạnh ồn ào', hushed: 'có khách ồn thì quán nhắc ngay', scolded: 'bị nhắc nhở giữa lúc đang vui',
  momhid: 'được chủ quán giấu giùm khi mẹ tới tìm', mompointed: 'bị chủ quán chỉ chỗ cho mẹ',
};

// Gợi ý "Lần tới" trên bảng cuối ngày. Tính cách có gợi ý riêng thì dùng trước.
const HINTS = {
  wait: 'Xếp khách vào máy trống sớm hơn; đứng ở cửa lâu là mất hứng.',
  walkout: 'Đón khách ở cửa trước, việc khác làm sau.',
  dirty: 'Bấm 🧹 dọn bàn trước khi xếp khách mới.',
  short: 'Thả tay đúng vạch vàng khi nạp giờ.',
  closed: 'Muốn đóng cửa thì bấm "Chuẩn bị đóng cửa" sớm cho khách chơi nốt, đừng đóng ngay.',
  foodslow: 'Làm món ngay khi khách gọi; đồ uống làm nhanh, ưu tiên trước.',
  missing: 'Đối chiếu phiếu gọi món trước khi mang ra.',
  orderwrong: 'Training nhân viên hoặc tăng lương ở tab Hóa đơn buổi sáng.',
  raw: 'Canh vùng vàng khi nấu mì.', mushy: 'Canh vùng vàng khi nấu mì.',
  coffee: 'Rót cà phê tới vạch vàng.',
  outofstock: 'Buổi sáng nhập đủ hàng.',
  sick: 'Bỏ hàng hết date trong kho.',
  broken: 'Máy treo thì bấm 🔧 sửa ngay; bộ lưu điện UPS giúp ít treo hơn.',
  rage: 'Máy treo thì bấm 🔧 sửa ngay; để lâu khách sẽ bỏ về.',
  lag: 'Xếp khách vào máy đúng hạng họ cần.',
  again: 'Khách quen nhớ chuyện lần trước: đọc lời nhắc ở cửa và xử lý đúng việc đó.',
  pester: 'Khách đang chơi ổn thì đừng hỏi nhiều; khách rụt rè 😶 mới cần hỏi han.',
  shyskip: 'Khách rụt rè ngại gọi: thấy 💭 trên máy thì bấm vào hỏi.',
  ping: 'Quán đông mà mạng yếu: nâng gói mạng ở tab Hóa đơn buổi sáng.',
  hot: 'Trời nóng thì bật ❄️ điều hòa ở thanh trên màn chơi.',
  outage: 'Mua bộ lưu điện UPS để khách kịp lưu game khi cúp điện.',
  dark: 'Có máy phát điện thì bấm 🛢️ nổ máy khi cúp điện; không có thì khách chờ lâu sẽ đòi tiền rồi về.',
  worn: 'Buổi sáng sửa hoặc thay phím chuột bị hỏng ở tab Nâng máy.',
  noise: 'Thấy 📢 trên máy thì bấm vào nhắc nhở ngay; tai nghe chống ồn giúp khách ngồi cạnh đỡ khó chịu.',
};
const TRAIT_HINTS = {
  voi: {
    wait: 'Khách nóng vội chịu chờ ngắn hơn: xếp máy cho họ trước.',
    walkout: 'Khách nóng vội chịu chờ ngắn hơn: xếp máy cho họ trước.',
    foodslow: 'Khách nóng vội: làm món cho họ trước.',
  },
  kytinh: {
    dirty: 'Khách kỹ tính rất ngại bàn bẩn: dọn xong rồi hẵng xếp.',
    broken: 'Khách kỹ tính khó chịu gấp rưỡi khi máy treo: sửa ngay.',
    rage: 'Khách kỹ tính khó chịu gấp rưỡi khi máy treo: sửa ngay.',
  },
  tietkiem: {
    short: 'Khách tiết kiệm để ý từng phút: canh thả tay đúng vạch.',
  },
};

// =====================================================================
//  KHÁCH QUEN & KÝ ỨC
// =====================================================================
// Sự việc xấu nào khách sẽ nhớ, gom theo nhóm (vd. mì sống hay mì nát đều là "cook")
const MEM_GROUP = {
  wait: 'wait', walkout: 'wait', dirty: 'dirty', short: 'short', closed: 'closed', lag: 'lag',
  broken: 'broken', rage: 'broken', foodslow: 'foodslow', raw: 'cook', mushy: 'cook',
  missing: 'missing', coffee: 'coffee', outofstock: 'outofstock',
  ping: 'ping', hot: 'hot', worn: 'worn', noise: 'noise',
};
// remind = lời nhắc ở cửa lần sau (báo trước cho người chơi) · again = bị lại lỗi cũ · better = lần này đã ổn
const MEMORY_TEXT = {
  wait: {
    remind: 'Hôm trước em chờ máy lâu lắm đó nha.',
    again: 'Lần trước đã chờ máy lâu, hôm nay vẫn vậy. Chán ghê.',
    better: 'Hôm trước phải chờ máy lâu, hôm nay vào là có máy luôn.',
  },
  dirty: {
    remind: 'Hôm trước bàn bẩn, hôm nay lau giúp em nha.',
    again: 'Lần trước bàn bẩn, hôm nay vẫn bẩn.',
    better: 'Hôm trước bàn bẩn, hôm nay sạch sẽ rồi.',
  },
  short: {
    remind: 'Hôm trước nạp thiếu giờ đó, hôm nay nạp đủ nha.',
    again: 'Lần trước nạp thiếu, hôm nay lại thiếu nữa.',
    better: 'Hôm trước bị nạp thiếu, hôm nay nạp chuẩn rồi.',
  },
  closed: {
    remind: 'Hôm trước chưa hết giờ đã đóng cửa đó nha.',
    again: 'Lần trước bị mời về sớm, hôm nay lại vậy.',
    better: 'Hôm trước bị về sớm, hôm nay chơi đủ giờ rồi.',
  },
  lag: {
    remind: 'Hôm trước máy yếu quá, cho em máy khỏe hơn nha.',
    again: 'Lần trước máy yếu, hôm nay vẫn cho ngồi máy yếu.',
    better: 'Hôm trước máy yếu, hôm nay được máy chuẩn rồi.',
  },
  broken: {
    remind: 'Hôm trước máy treo hoài, cho em máy ổn nha.',
    again: 'Lần trước máy treo, hôm nay lại treo.',
    better: 'Hôm trước máy treo mãi, hôm nay chạy ngon lành.',
  },
  foodslow: {
    remind: 'Hôm trước món ra lâu quá, hôm nay nhanh giúp em nha.',
    again: 'Lần trước món ra lâu, hôm nay vẫn lâu.',
    better: 'Hôm trước món hơi lâu, hôm nay nhanh hơn rồi.',
  },
  cook: {
    remind: 'Hôm trước mì chưa ngon lắm đâu nha.',
    again: 'Mì lần trước đã không ngon, hôm nay vẫn vậy.',
    better: 'Hôm trước mì nấu chưa tới, hôm nay ngon rồi.',
  },
  missing: {
    remind: 'Hôm trước mang món thiếu đó nha.',
    again: 'Lần trước mang thiếu món, hôm nay lại thiếu.',
    better: 'Hôm trước mang thiếu món, hôm nay đủ rồi.',
  },
  coffee: {
    remind: 'Hôm trước cà phê pha chưa chuẩn đâu nha.',
    again: 'Cà phê lần trước đã dở, hôm nay vẫn vậy.',
    better: 'Hôm trước cà phê chưa chuẩn, hôm nay ngon rồi.',
  },
  outofstock: {
    remind: 'Hôm nay quán còn đồ ăn không anh?',
    again: 'Lần trước quán xin lỗi vì hết món, hôm nay vẫn hết. Xin lỗi hoài cũng vậy.',
    better: 'Hôm trước quán hết món, hôm nay có đủ rồi.',
  },
  ping: {
    remind: 'Hôm trước mạng giật quá, hôm nay ổn chưa anh?',
    again: 'Lần trước mạng đã giật, hôm nay vẫn giật.',
    better: 'Hôm trước mạng lag, hôm nay mượt rồi.',
  },
  hot: {
    remind: 'Hôm trước quán nóng quá, bật máy lạnh giúp em nha.',
    again: 'Lần trước đã nóng, hôm nay vẫn nóng như lò.',
    better: 'Hôm trước nóng muốn xỉu, hôm nay mát rồi.',
  },
  worn: {
    remind: 'Hôm trước bàn phím liệt nút, đổi cái khác giúp em nha.',
    again: 'Lần trước phím liệt, hôm nay vẫn liệt.',
    better: 'Hôm trước phím hỏng, hôm nay đã thay rồi.',
  },
  noise: {
    remind: 'Hôm trước ngồi cạnh người hát hò ầm ĩ, hôm nay cho em chỗ yên tĩnh nha.',
    again: 'Lần trước bên cạnh ồn ào, hôm nay vẫn vậy.',
    better: 'Hôm trước ồn quá, hôm nay yên tĩnh dễ chịu hẳn.',
  },
};
// Lời chào của khách quen khi lần trước không có gì phải phàn nàn
const REGULAR_GREETS = ['Lại là em đây!', 'Em ghé nữa nè!', 'Chào anh, hôm nay đông không?'];
const FAVPC_GREETS = [n => `Còn máy ${n} không anh? Em quen máy đó rồi.`, n => `Cho em máy ${n} như mọi lần nha.`];
