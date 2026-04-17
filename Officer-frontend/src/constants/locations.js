const dedupe = (values) => Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim())));

const townsWithDefaultVillage = (towns) => (
  dedupe(towns).reduce((acc, town) => {
    acc[town] = [town];
    return acc;
  }, {})
);

const CENTRAL_PROVINCE_TREE = {
  Chibombo: townsWithDefaultVillage([
    'Katuba', 'Chilochabalenje', 'Cholokelo', 'Chunga', 'Kabile', 'Kamaila', 'Muchenje',
    'Mungule', 'Keembe', 'Chaloshi', 'Chibombo', 'Chikobo', 'Chitanda', 'Ipongo',
    'Itumbwe', 'Kakoma', 'Kalola', 'Lunjofwa', 'Malambanyama', 'Mashikili', 'Muundu',
  ]),
  Chisamba: townsWithDefaultVillage([
    'Chisamba', 'Chamuka', 'Chikonkomene', 'Kamano', 'Liteta', 'Miswa', 'Monangombe',
    'Mulungushi', 'Muswishi', 'Mutenga', 'Mwantaya', 'Mwapula',
  ]),
  Chitambo: townsWithDefaultVillage([
    'Chitambo', 'Chalilo', 'Chipundu', 'Kabansa', 'Kanona', 'Katonga', 'Lulimala',
    'Luombwa', 'Lusenga', 'Lushibashi', 'Mailo', 'Muchinka', 'Mweshe', 'Nakatambo',
    'Serenje',
  ]),
  Kabwe: {
    Mukobeko: ['Mine', 'Highridge'],
    ...townsWithDefaultVillage([
      'Bwacha', 'Ben Kafupi', 'Chililalila', 'Chimanimani', 'Chinyanja', "Kang'omba",
      'Kabwe', 'Kawama', 'Makululu', 'Munga', 'Munyama', 'Muwowo East', 'Muwowo West', 'Ngungu',
      'Zambezi', 'Kabwe Central', 'Chirwa', 'David Ramushu', 'Highridge', 'Justine Kabwe',
      'Kalonga', 'Kaputula', 'Katondo', 'Luangwa', 'Luansase', 'Lukanga', 'Moomba',
      'Mpima', 'Nakoli', 'Njanji', 'Waya',
    ]),
  },
  'Kapiri Mposhi': townsWithDefaultVillage([
    'Kapiri Mposhi', "Chang'ondo", 'Chibwelelo', 'Imansa', 'Kabwale', 'Kakwelesa',
    'Kampumba', 'Kasanta', 'Kashitu', 'Lukanga', 'Lunchu', 'Lunsemfwa', 'Mpunde',
    'Mubofwe', 'Munga', 'Mushimbili', 'Muteteshi', 'Nchembwe',
  ]),
  Luano: townsWithDefaultVillage([
    'Mkushi South', 'Chimika', "Ching'ombe", 'Chipaba', 'Kamimbya', 'Katukutu', 'Lundashi',
    'Lwambulu', 'Mibanga', 'Munda', 'Muswishi', 'Mwalala', 'Nkomashi',
  ]),
  Mkushi: townsWithDefaultVillage([
    'Mkushi North', 'Chalata', 'Chibefwe', 'Chikanda', 'Chitina', 'Kabengeleshi', 'Kalwa',
    'Matuku', 'Munsakamba', 'Munshibemba', 'Musofu', 'Nkolonga', 'Nkulumashiba', 'Nkumbi',
    'Nshinso', 'Tembwe', 'Upper Lunsemfwa',
  ]),
  Mumbwa: townsWithDefaultVillage([
    'Mumbwa', 'Chibolyo', 'Kalwanyembe', 'Kamilambo', 'Lutale', 'Makebo', 'Mpusu', 'Mumba',
    'Mupona', 'Nalusanga', 'Naluvwi', 'Nambala', 'Shimbizhi', 'Nangoma', 'Chisalu', 'Choma',
    'Matala', 'Myooye', 'Nakasaka', 'Nalubanda', 'Shichanzu',
  ]),
  Ngabwe: townsWithDefaultVillage([
    'Lufubu', 'Chilwa', 'Chisanga', 'Chisangwa', 'Chitumba', 'Iwonde', 'Luamala', 'Mukubwe',
    'Ngabwe',
  ]),
  Serenje: townsWithDefaultVillage([
    'Muchinga', 'Chibale', 'Chisomo', 'Kabwe Kupela', 'Lukusashi', 'Masaninga', 'Sancha',
    'Serenje', 'Chisangwa', 'Ibolelo', 'Kabamba', 'Kashishi', 'Lupiya', 'Mbaswa', 'Milenje',
    'Muchinda', 'Musangashi',
  ]),
  Shibuyunji: townsWithDefaultVillage([
    'Mwembeshi', 'Chabota', 'Chikonka', 'Kalundu', 'Kapyanga East', 'Kapyanga West',
    'Makombwe', 'Mukulaikwa', 'Mutombe', 'Nakaiba', 'Nampeya', 'Nampundwe', 'Sala',
  ]),
};

const LUSAKA_PROVINCE_TREE = {
  Chilanga: townsWithDefaultVillage([
    'Chilanga', 'Chilongolo', 'Chinyanja', 'Kalundu', 'Kasupe', 'Mondengwa',
    'Mount Makulu', 'Mwembeshi', 'Nakachenje', 'Namalombwe', 'New Farms', 'Nyemba',
  ]),
  Chongwe: townsWithDefaultVillage([
    'Chongwe', 'Chainda', 'Chalimbana', 'Chinkuli', 'Kanakantapa', 'Kapete',
    'Kapwayambale', 'Kasenga', 'Kasisi', 'Katoba', 'Lwimba', 'Madido', 'Manyika',
    'Mulenje', 'Mwalumina', 'Nakatindi', 'Nchute', 'Ngwerere', 'Njolwe', 'Ntandabale',
    'Palabana',
  ]),
  Kafue: townsWithDefaultVillage([
    'Kafue', 'Chifwema', 'Chikupi', 'Chisakila', 'Chisankane', 'Chitende', 'Chiyaba',
    'Kabweza', 'Kambale', 'Kasenje', 'Lukolongo', 'Magoba', 'Malundu', 'Matanda', 'Mungu',
    'Shabusale', 'Shikoswe', 'Shimabala',
  ]),
  Luangwa: townsWithDefaultVillage([
    'Feira', 'Chikoma', 'Chiriwe', 'Dzalo', 'Kabowo', 'Kaluluzi', 'Kapoche', 'Katondwe',
    'Kaunga', 'Kavuula', 'Lunya', "M'kaliva", 'Mandombe', 'Mankhokwe', 'Mburuma', 'Mphuka',
    'Mwalilia', 'Phwazi',
  ]),
  Lusaka: {
    Kanyama: ['John Laing', 'George'],
    Matero: ['Kabanana', 'Chunga'],
    ...townsWithDefaultVillage([
      'Chawama', 'John Ho', 'Lilayi', 'Nkoloma', 'Kabwata', 'Chilenje', 'Kamulanga',
      'Kamwala', 'Libala', 'Chinika', 'Garden Park', 'Harry Mwanga', 'Nkumbula',
      'Makeni Villa', 'Munkolo', 'Lusaka Central', 'Independence', 'Kabulonga', 'Lubwa',
      'Silwizya', 'Mandevu', 'Chaisa', 'Justin Kabwe', 'Mpulungu', 'Mulungushi',
      'Ngwerere', 'Raphael Chota', 'Roma', 'Kapwepwe', 'Lima', 'Muchinga', 'Mwembeshi',
      'Munali', 'Chainda', 'Chakunkula', 'Kalikiliki', 'Kalingalinga', 'Mtendere',
    ]),
  },
  Rufunsa: townsWithDefaultVillage([
    'Rufunsa', 'Bunda_bunda', 'Chamulimba', 'Chintimbwi', 'Kabuyu', 'Kankumba', 'Mankhanda',
    'Mulamba', 'Mwachilele', 'Nyamanongo', 'Nyangwena', 'Shikabeta',
  ]),
};

export const LOCATION_TREE_SEEDED = {
  Lusaka: LUSAKA_PROVINCE_TREE,
  Central: CENTRAL_PROVINCE_TREE,
};

export default LOCATION_TREE_SEEDED;
