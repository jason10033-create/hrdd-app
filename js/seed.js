/* Default configuration for the Human Rights topic.
 * Everything here can be edited in the admin backend; these are only first-run defaults.
 * Traditional Chinese survey texts are kept verbatim from "2026 Moxa 人權盡職調查題目". */
(function () {
  const L = (tc, sc, en) => ({ tc, sc, en });

  const org = {
    units: [
      { id: 'MHQ', parent: null, type: 'hq', name: L('MHQ 總部', 'MHQ 总部', 'MHQ Headquarters') },
      { id: 'RBU', parent: null, type: 'group', name: L('RBU 海外公司', 'RBU 海外公司', 'RBU Overseas') },
      { id: 'MAT', parent: 'RBU', type: 'region', name: L('MAT 亞太', 'MAT 亚太', 'MAT APAC') },
      { id: 'MCN', parent: 'RBU', type: 'region', name: L('MCN 中國', 'MCN 中国', 'MCN China') },
      { id: 'MUS', parent: 'RBU', type: 'region', name: L('MUS 美國', 'MUS 美国', 'MUS Americas') },
      { id: 'MEU', parent: 'RBU', type: 'region', name: L('MEU 歐洲', 'MEU 欧洲', 'MEU Europe') }
    ]
  };

  const questions = [
    { id: 'q1', no: 1, cat: L('多元、尊重與平等', '多元、尊重与平等', 'Diversity, Respect & Equality'),
      text: L('在招募、任用、發展、績效、晉升、獎酬時，給予和其工作表現無關的歧視或不公平待遇。',
              '在招聘、任用、发展、绩效、晋升、奖酬时，给予和其工作表现无关的歧视或不公平待遇。',
              'Discrimination or unfair treatment unrelated to job performance in recruitment, appointment, development, performance, promotion or rewards.'),
      short: L('歧視與不公平待遇', '歧视与不公平待遇', 'Discrimination & unfair treatment') },
    { id: 'q2', no: 2, cat: L('多元、尊重與平等', '多元、尊重与平等', 'Diversity, Respect & Equality'),
      text: L('發生職場暴力、性騷擾或霸凌等行為。', '发生职场暴力、性骚扰或霸凌等行为。',
              'Occurrence of workplace violence, sexual harassment, bullying or similar behavior.'),
      short: L('職場不法侵害', '职场不法侵害', 'Workplace violence & harassment') },
    { id: 'q3', no: 3, cat: L('禁止童工與強迫勞動', '禁止童工与强迫劳动', 'Prohibition of Child & Forced Labor'),
      text: L('非法聘用未滿法定年齡之工作者。', '非法聘用未满法定年龄的工作者。',
              'Illegal employment of workers under the legal working age.'),
      short: L('非法聘僱童工', '非法雇佣童工', 'Child labor') },
    { id: 'q4', no: 4, cat: L('禁止童工與強迫勞動', '禁止童工与强迫劳动', 'Prohibition of Child & Forced Labor'),
      text: L('以不當要求或威脅，包括但不限於扣押證件或工資、限制行動自由等形式，造成強迫勞動之情事。',
              '以不当要求或威胁，包括但不限于扣押证件或工资、限制行动自由等形式，造成强迫劳动的情事。',
              'Forced labor caused by improper demands or threats, including but not limited to withholding identity documents or wages, or restricting freedom of movement.'),
      short: L('強迫勞動', '强迫劳动', 'Forced labor') },
    { id: 'q5', no: 5, cat: L('勞動條件保障', '劳动条件保障', 'Working Conditions'),
      text: L('在工作環境或勞動條件未能遵循法定要求，以致同仁基本工作權利（如工時、薪資、休假等）無法被保障。',
              '在工作环境或劳动条件未能遵循法定要求，以致员工基本工作权利（如工时、薪资、休假等）无法得到保障。',
              'Work environment or working conditions fail to meet legal requirements, so that employees\' basic rights (e.g., working hours, wages, leave) are not protected.'),
      short: L('勞動條件保障', '劳动条件保障', 'Working conditions') },
    { id: 'q6', no: 6, cat: L('工作環境健康與安全', '工作环境健康与安全', 'Occupational Health & Safety'),
      text: L('未能提供安全與健康的工作環境，或未能讓同仁受到良好職業安全衛生訓練，因而造成同仁受到職業災害或身心健康影響。',
              '未能提供安全与健康的工作环境，或未能让员工接受良好的职业安全卫生培训，因而造成员工遭受职业伤害或身心健康影响。',
              'Failure to provide a safe and healthy work environment or adequate occupational safety and health training, resulting in occupational injuries or impacts on employees\' physical or mental health.'),
      short: L('工作環境健康與安全', '工作环境健康与安全', 'Health & safety') },
    { id: 'q7', no: 7, cat: L('保護隱私與個資', '保护隐私与个人信息', 'Privacy & Personal Data'),
      text: L('因個人疏失或系統漏洞，導致同仁、客戶或利害關係人的個人資訊外洩。',
              '因个人疏失或系统漏洞，导致员工、客户或利益相关方的个人信息泄露。',
              'Leakage of personal information of employees, customers or stakeholders due to individual negligence or system vulnerabilities.'),
      short: L('隱私與個資', '隐私与个人信息', 'Privacy & personal data') },
    { id: 'q8', no: 8, cat: L('自由結社與多元溝通', '自由结社与多元沟通', 'Freedom of Association & Communication'),
      text: L('同仁不被允許參與外部工會或團體活動，缺乏與雇主進行團體協商的機制。',
              '员工不被允许参与外部工会或团体活动，缺乏与雇主进行集体协商的机制。',
              'Employees are not allowed to join external unions or group activities, and there is no mechanism for collective bargaining with the employer.'),
      short: L('參加工會與團體活動', '参加工会与团体活动', 'Unions & association') },
    { id: 'q9', no: 9, cat: L('自由結社與多元溝通', '自由结社与多元沟通', 'Freedom of Association & Communication'),
      text: L('未能提供合適與安全的管道讓員工發表意見，或以任何方式抑制員工言論。',
              '未能提供合适与安全的渠道让员工发表意见，或以任何方式压制员工言论。',
              'Failure to provide appropriate and safe channels for employees to express opinions, or suppressing employee speech in any way.'),
      short: L('多元溝通管道', '多元沟通渠道', 'Communication channels') }
  ].map(q => Object.assign({ enabled: true }, q));

  const scale = {
    p: [
      { level: 1, label: L('極低', '极低', 'Very Low'), range: '<10%', desc: L('一般情況下不會發生', '一般情况下不会发生', 'Would not occur under normal circumstances'), detail: L('每年發生一次以下', '每年发生一次以下', 'Less than once a year') },
      { level: 2, label: L('低', '低', 'Low'), range: '10~30%', desc: L('極少情況下會發生', '极少情况下会发生', 'Occurs in very rare circumstances'), detail: L('每半年發生一次以上', '每半年发生一次以上', 'At least once every six months') },
      { level: 3, label: L('中等', '中等', 'Moderate'), range: '30~70%', desc: L('某些情況下會發生', '某些情况下会发生', 'Occurs in some circumstances'), detail: L('每季發生一次以上', '每季发生一次以上', 'At least once a quarter') },
      { level: 4, label: L('高', '高', 'High'), range: '70~90%', desc: L('較多情況下會發生', '较多情况下会发生', 'Occurs in many circumstances'), detail: L('每月發生一次以上', '每月发生一次以上', 'At least once a month') },
      { level: 5, label: L('極高', '极高', 'Very High'), range: '>90%', desc: L('常常會發生', '常常会发生', 'Occurs frequently'), detail: L('每週發生一次以上', '每周发生一次以上', 'At least once a week') }
    ],
    s: [
      { level: 1, label: L('極輕微', '极轻微', 'Very Minor'), desc: L('影響甚微；1年內可恢復', '影响甚微；1年内可恢复', 'Negligible impact; recoverable within 1 year') },
      { level: 2, label: L('輕微', '轻微', 'Minor'), desc: L('輕微傷害或疾病(無工時損失)；需1~3年恢復', '轻微伤害或疾病(无工时损失)；需1~3年恢复', 'Minor injury or illness (no lost time); 1–3 years to recover') },
      { level: 3, label: L('中等', '中等', 'Moderate'), desc: L('造成傷害需進行復健(有工時損失)；需3~5年恢復', '造成伤害需进行康复(有工时损失)；需3~5年恢复', 'Injury requiring rehabilitation (lost time); 3–5 years to recover') },
      { level: 4, label: L('重大', '重大', 'Major'), desc: L('導致身心障礙；需5~10年恢復', '导致身心障碍；需5~10年恢复', 'Leads to disability; 5–10 years to recover') },
      { level: 5, label: L('極重大', '极重大', 'Extreme'), desc: L('導致死亡；不太可能恢復原狀', '导致死亡；不太可能恢复原状', 'Leads to death; unlikely to be remedied') }
    ],
    sDesc: L('對於員工身心健康、安全或個人權益的影響程度', '对于员工身心健康、安全或个人权益的影响程度',
             'Level of impact on employees\' physical and mental health, safety, or personal rights and interests'),
    options: [
      L('1: 極低/極輕微', '1: 极低/极轻微', '1: Very low / Very minor'),
      L('2: 低/輕微', '2: 低/轻微', '2: Low / Minor'),
      L('3: 中等', '3: 中等', '3: Moderate'),
      L('4: 高/重大', '4: 高/重大', '4: High / Major'),
      L('5: 極高/極重大', '5: 极高/极重大', '5: Very high / Extreme')
    ]
  };

  const survey = {
    title: L('2026 Moxa 人權盡職調查 (for RBU)', '2026 Moxa 人权尽职调查 (for RBU)', '2026 Moxa Human Rights Due Diligence (for RBU)'),
    intro: L('為回應客戶期待並履行企業責任，2026年Moxa將執行海外經營區域的人權盡職調查。\n敬請各位受邀主管與HR夥伴，協助評估場域中可能的人權議題風險，並於10/2(五)前完成此調查表。',
             '为回应客户期待并履行企业责任，2026年Moxa将执行海外经营区域的人权尽职调查。\n敬请各位受邀主管与HR伙伴，协助评估场域中可能的人权议题风险，并于10/2(五)前完成此调查表。',
             'To respond to customer expectations and fulfil our corporate responsibility, Moxa will conduct human rights due diligence across its overseas operating regions in 2026.\nInvited managers and HR partners are kindly asked to assess potential human rights risks in their workplaces and complete this survey by Friday, 10/2.'),
    contact: L('如有任何疑問，歡迎與人權盡職調查負責人 - HR Jason CH Kuo 聯繫。',
               '如有任何疑问，欢迎与人权尽职调查负责人 - HR Jason CH Kuo 联系。',
               'If you have any questions, please contact the human rights due diligence owner - HR Jason CH Kuo.'),
    required: L('* 必答', '* 必答', '* Required'),
    nameNote: L('* 此表單將記錄您的名稱，請填入您的名稱。', '* 此表单将记录您的名称，请填入您的名称。', '* This form will record your name, please fill in your name.'),
    instrTitle: L('人權風險盡職調查說明', '人权风险尽职调查说明', 'Human Rights Risk Due Diligence Instructions'),
    instr: [
      L('1.請依照您對於自己「所負責單位」的主觀理解與經驗，評估Moxa在下列人權風險的「發生機率」與「嚴重程度」\n(請參考下圖定義，如需更完整說明請參考email附件)',
        '1.请依照您对于自己「所负责单位」的主观理解与经验，评估Moxa在下列人权风险的「发生概率」与「严重程度」\n(请参考下图定义，如需更完整说明请参考email附件)',
        '1. Based on your own understanding and experience of the unit you are responsible for, assess the "Probability" and "Severity" of the following human rights risks at Moxa.\n(Please refer to the definitions below; see the email attachment for full details.)'),
      L('2.如有個人不易評估之題項，歡迎邀請合適人選共同討論', '2.如有个人不易评估的题项，欢迎邀请合适人选共同讨论', '2. If an item is difficult to assess on your own, feel free to discuss it with appropriate colleagues.'),
      L('3.如有回填為高機率、高嚴重之題項，Process owner 可能視情況進一步訪談與瞭解', '3.如有回填为高概率、高严重的题项，Process owner 可能视情况进一步访谈与了解', '3. For items rated high probability and high severity, the process owner may follow up with an interview where appropriate.')
    ],
    regionQ: L('請問您所負責的區域是？', '请问您所负责的区域是？', 'Which region are you responsible for?'),
    regionOptions: ['MHQ', 'MAT', 'MCN', 'MUS', 'MEU'],
    pLabel: L('發生機率\n(Probability)', '发生概率\n(Probability)', 'Probability'),
    sLabel: L('嚴重程度\n(Severity)', '严重程度\n(Severity)', 'Severity'),
    commentTitle: L('補充說明', '补充说明', 'Additional comments'),
    commentDesc: L('如以上有任何一項您的評估「發生機率」 ≧ 3 (中等)，請在此補充描述其實務上可能之狀況或案例',
                   '如以上有任何一项您的评估「发生概率」 ≧ 3 (中等)，请在此补充描述其实务上可能的状况或案例',
                   'If you rated the "Probability" of any item above as ≧ 3 (Moderate), please describe possible practical situations or cases here.'),
    optional: L('※選填', '※选填', '※Optional')
  };

  // Zone grid: 10 rows x 10 cols, each cell = 0.5 x 0.5.
  // zones[0] is the TOP row (Probability 4.5–5.0); column 0 is Severity 0–0.5.
  // H = 高度關注, M = 中度關注, L = 低度關注. Default follows the 2025 sustainability report chart.
  const zones = [
    'MMHHHHHHHH',
    'MMHHHHHHHH',
    'MMMMHHHHHH',
    'MMMMHHHHHH',
    'LLMMMMHHHH',
    'LLMMMMHHHH',
    'LLLLMMMMHH',
    'LLLLMMMMHH',
    'LLLLLLMMMM',
    'LLLLLLMMMM'
  ];

  const topic = {
    id: 'hr',
    name: L('人權', '人权', 'Human Rights'),
    questions, scale, survey, zones,
    zoneLabels: { H: L('高度關注', '高度关注', 'High concern'), M: L('中度關注', '中度关注', 'Medium concern'), L: L('低度關注', '低度关注', 'Low concern') },
    zoneColors: { H: '#2F9C95', M: '#A6D6D0', L: '#DCDFE3' },
    dims: [
      { id: 'prevent', name: L('管理與預防', '管理与预防', 'Management & Prevention') },
      { id: 'train', name: L('訓練與宣導', '培训与宣导', 'Training & Awareness') },
      { id: 'remedy', name: L('減緩或補救', '减缓或补救', 'Mitigation & Remediation') }
    ]
  };

  const cycles = [{ id: '2026', name: '2026', open: true, active: true }];

  const urgency = {
    riskWeight: { H: 1, M: 0.6 },
    itemWeight: { G: 1, M: 1, H: 1.5, C: 1 },
    tiers: [60, 40, 20] // >= immediate, >= priority, >= planned, else maintain
  };

  // MHQ 2025 results (aggregated; no individual data). Reused for the 2026 cycle per owner's decision.
  const mhqAgg = (label, P, S) => ({
    id: 'mhq2025-' + label, cycle: '2026', unit: 'MHQ', group_label: label, name: label, email: '',
    lang: '', submitted_at: '2025-10-01T00:00:00', source: 'aggregate', weight: 1, comment: '',
    note: '2025 MHQ', answers: Object.fromEntries(P.map((p, i) => ['q' + (i + 1), { p, s: S[i] }]))
  });
  const mhq = [
    mhqAgg('HRBP', [1.1666666667, 1.3333333333, 1, 1, 1.0833333333, 1.5, 1.6666666667, 1.1666666667, 1.1666666667],
                   [1.4166666667, 1.75, 1.3333333333, 1.4166666667, 1.4166666667, 1.75, 1.6666666667, 1.25, 1.3333333333]),
    mhqAgg('RM', [1.3333333333, 1.5833333333, 1, 1, 1.25, 1.1666666667, 1.5, 1.1666666667, 1.3333333333],
                 [2.5833333333, 3.0833333333, 2.4166666667, 2.5, 2.3333333333, 2.6666666667, 2.5833333333, 2.1666666667, 2.25])
  ];

  window.HRDD_SEED = { org, topic, cycles, urgency, responses: mhq };
})();
