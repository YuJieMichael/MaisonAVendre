export const assistanceIds = ['photos', 'video', 'listing', 'pricing', 'visits', 'offers', 'unsure'] as const;
export const enquiryOptions = {
  en: {
    compare: 'Compare the two approaches', task: 'Your involvement', broker: 'Broker-led sale', hybrid: 'You + a broker',
    rows: [['Coordination', 'The broker coordinates the sale with you.', 'You take an active role and agree on responsibilities together.'], ['Preparing and presenting the property', 'Plan the preparation and marketing with your broker.', 'Choose the help you need for photos, video and the listing.'], ['Viewings and offers', 'Agree with your broker on viewings and offer support.', 'Choose the stages where you want broker support.']],
    assistance: 'What would you like help with? · optional', hint: 'Select as many as you like. This is a request for information, not a purchase.',
    services: ['Property photography', 'Property video', 'Listing description and presentation', 'Price / market analysis', 'Organising viewings', 'Offers and negotiation support', 'Not sure yet — please contact me'],
    contact: 'Contact preferences · optional', language: 'Preferred language', method: 'Preferred contact method', none: 'No preference', email: 'Email', phone: 'Phone', availability: 'Convenient contact times', timeHint: 'For example: weekdays after 6 pm (please specify your time zone).', phoneHint: 'If you prefer a call, you can add your number above. Otherwise we can reach you by email.',
  },
  fr: {
    compare: 'Comparer les deux modes', task: 'Votre participation', broker: 'Vente avec courtier', hybrid: 'Vous + un courtier',
    rows: [['Coordination', 'Le courtier coordonne la vente avec vous.', 'Vous participez activement et convenez ensemble des responsabilités.'], ['Préparation et présentation', 'Planifiez la préparation et la mise en marché avec votre courtier.', 'Choisissez l’aide souhaitée pour les photos, la vidéo et la fiche.'], ['Visites et offres', 'Convenez avec le courtier de l’organisation des visites et du suivi des offres.', 'Choisissez les étapes où vous souhaitez l’appui du courtier.']],
    assistance: 'Quelle aide souhaitez-vous ? · facultatif', hint: 'Plusieurs choix possibles. Il s’agit d’une demande de renseignements, sans achat.',
    services: ['Photographie immobilière', 'Vidéo de la propriété', 'Description et présentation de la fiche', 'Analyse de prix / du marché', 'Organisation des visites', 'Accompagnement pour les offres et la négociation', 'Je ne sais pas encore — contactez-moi'],
    contact: 'Préférences de contact · facultatif', language: 'Langue de communication', method: 'Moyen de contact préféré', none: 'Sans préférence', email: 'Courriel', phone: 'Téléphone', availability: 'Disponibilités pour vous contacter', timeHint: 'Par exemple : en semaine après 18 h (précisez votre fuseau horaire).', phoneHint: 'Pour un appel, vous pouvez ajouter votre numéro ci-dessus. Sinon, nous pouvons vous joindre par courriel.',
  },
  zh: {
    compare: '两种卖法有什么区别？', task: '参与方式', broker: '经纪卖', hybrid: '自己 + 经纪卖',
    rows: [['流程协调', '经纪主导协调，与您沟通卖房进度。', '您主动参与，与经纪商定各自分工。'], ['房屋展示与推广', '与经纪一起确定准备和推广安排。', '按需选择摄影、视频、房源介绍等帮助。'], ['看房与报价', '与经纪约定看房安排及报价跟进服务。', '选择需要经纪协助的环节。']],
    assistance: '希望获得哪些帮助？· 选填', hint: '可多选，目前仅表达需求，不代表购买或付款。',
    services: ['房屋摄影', '房屋视频', '房源介绍与展示设计', '价格 / 市场分析', '安排看房', '报价与谈判协助', '暂时不确定，请联系我'],
    contact: '联系偏好 · 选填', language: '希望使用的语言', method: '偏好的联系方式', none: '无偏好', email: '邮件', phone: '电话', availability: '方便联系的时间', timeHint: '例如：工作日晚上 6 点后（请注明所在时区）。', phoneHint: '如果希望电话联系，可以在上方留下号码；未填号码时，我们可以通过邮箱联系您。',
  },
};
