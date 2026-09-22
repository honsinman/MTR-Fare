window.MTR_STATIONS = [
['Central','中環'],['Admiralty','金鐘'],['Tsim Sha Tsui','尖沙咀'],['Jordan','佐敦'],['Yau Ma Tei','油麻地'],['Mong Kok','旺角'],['Shek Kip Mei','石硤尾'],['Kowloon Tong','九龍塘'],['Lok Fu','樂富'],['Wong Tai Sin','黃大仙'],['Diamond Hill','鑽石山'],['Choi Hung','彩虹'],['Kowloon Bay','九龍灣'],['Ngau Tau Kok','牛頭角'],['Kwun Tong','觀塘'],['Prince Edward','太子'],['Sham Shui Po','深水埗'],['Cheung Sha Wan','長沙灣'],['Lai Chi Kok','荔枝角'],['Mei Foo','美孚'],['Lai King','荔景'],['Kwai Fong','葵芳'],['Kwai Hing','葵興'],['Tai Wo Hau','大窩口'],['Tsuen Wan','荃灣'],['Sheung Wan','上環'],['Wan Chai','灣仔'],['Causeway Bay','銅鑼灣'],['Tin Hau','天后'],['Fortress Hill','炮台山'],['North Point','北角'],['Quarry Bay','鰂魚涌'],['Tai Koo','太古'],['Sai Wan Ho','西灣河'],['Shau Kei Wan','筲箕灣'],['Heng Fa Chuen','杏花邨'],['Chai Wan','柴灣'],['Lam Tin','藍田'],['Hong Kong','香港'],['Kowloon','九龍'],['Olympic','奧運'],['Tsing Yi','青衣'],['Tung Chung','東涌'],['Yau Tong','油塘'],['Tiu Keng Leng','調景嶺'],['Tseung Kwan O','將軍澳'],['Hang Hau','坑口'],['Po Lam','寶琳'],['Nam Cheong','南昌'],['Sunny Bay','欣澳'],['Disneyland Resort','迪士尼'],['LOHAS Park','康城'],['Hung Hom','紅磡'],['Mong Kok East','旺角東'],['Tai Wai','大圍'],['Sha Tin','沙田'],['Fo Tan','火炭'],['Racecourse','馬場'],['University','大學'],['Tai Po Market','大埔墟'],['Tai Wo','太和'],['Fanling','粉嶺'],['Sheung Shui','上水'],['Lo Wu','羅湖'],['Lok Ma Chau','落馬洲'],['East Tsim Sha Tsui','尖東'],['Che Kung Temple','車公廟'],['Sha Tin Wai','沙田圍'],['City One','第一城'],['Shek Mun','石門'],['Tai Shui Hang','大水坑'],['Heng On','恆安'],['Ma On Shan','馬鞍山'],['Wu Kai Sha','烏溪沙'],['Austin','柯士甸'],['Tsuen Wan West','荃灣西'],['Tin Shui Wai','天水圍'],['Siu Hong','兆康'],['Yuen Long','元朗'],['Long Ping','朗屏'],['Tuen Mun','屯門'],['Kam Sheung Road','錦上路'],['Hin Keng','顯徑'],['Kai Tak','啟德'],['Sung Wong Toi','宋皇臺'],['To Kwa Wan','土瓜灣'],['Ho Man Tin','何文田'],['Whampoa','黃埔'],['Kennedy Town','堅尼地城'],['HKU','香港大學'],['Sai Ying Pun','西營盤'],['South Horizons','海怡半島'],['Lei Tung','利東'],['Wong Chuk Hang','黃竹坑'],['Ocean Park','海洋公園'],['Exhibition Centre','會展'],['Airport','機場'],['AsiaWorld-Expo','博覽館']
].map(([en,zh])=>({en,zh}));

window.MTR_LINES = {
  KTL:{nameEn:'Kwun Tong Line',nameZh:'觀塘綫',color:'#00A040',stations:['Whampoa','Ho Man Tin','Yau Ma Tei','Mong Kok','Prince Edward','Shek Kip Mei','Kowloon Tong','Lok Fu','Wong Tai Sin','Diamond Hill','Choi Hung','Kowloon Bay','Ngau Tau Kok','Kwun Tong','Lam Tin','Yau Tong','Tiu Keng Leng']},
  TWL:{nameEn:'Tsuen Wan Line',nameZh:'荃灣綫',color:'#E2231A',stations:['Tsuen Wan','Tai Wo Hau','Kwai Hing','Kwai Fong','Lai King','Mei Foo','Lai Chi Kok','Cheung Sha Wan','Sham Shui Po','Prince Edward','Mong Kok','Yau Ma Tei','Jordan','Tsim Sha Tsui','Admiralty','Central']},
  ISL:{nameEn:'Island Line',nameZh:'港島綫',color:'#0075C9',stations:['Kennedy Town','HKU','Sai Ying Pun','Sheung Wan','Central','Admiralty','Wan Chai','Causeway Bay','Tin Hau','Fortress Hill','North Point','Quarry Bay','Tai Koo','Sai Wan Ho','Shau Kei Wan','Heng Fa Chuen','Chai Wan']},
  SIL:{nameEn:'South Island Line',nameZh:'南港島綫',color:'#B5BD00',stations:['Admiralty','Ocean Park','Wong Chuk Hang','Lei Tung','South Horizons']},
  TCL:{nameEn:'Tung Chung Line',nameZh:'東涌綫',color:'#F7943E',stations:['Hong Kong','Kowloon','Olympic','Nam Cheong','Lai King','Tsing Yi','Sunny Bay','Tung Chung']},
  DRL:{nameEn:'Disneyland Resort Line',nameZh:'迪士尼綫',color:'#E8A9C2',stations:['Sunny Bay','Disneyland Resort']},
  TKL:{nameEn:'Tseung Kwan O Line',nameZh:'將軍澳綫',color:'#7B4B9A',stations:['North Point','Quarry Bay','Yau Tong','Tiu Keng Leng','Tseung Kwan O','Hang Hau','Po Lam'],branch:['Tseung Kwan O','LOHAS Park']},
  EAL:{nameEn:'East Rail Line',nameZh:'東鐵綫',color:'#58B6E7',stations:['Admiralty','Exhibition Centre','Hung Hom','Mong Kok East','Kowloon Tong','Tai Wai','Sha Tin','Fo Tan','University','Tai Po Market','Tai Wo','Fanling','Sheung Shui','Lo Wu'],branch:['Sheung Shui','Lok Ma Chau'],race:['Fo Tan','Racecourse','University']},
  TML:{nameEn:'Tuen Ma Line',nameZh:'屯馬綫',color:'#9B3827',stations:['Tuen Mun','Siu Hong','Tin Shui Wai','Long Ping','Yuen Long','Kam Sheung Road','Tsuen Wan West','Mei Foo','Nam Cheong','Austin','East Tsim Sha Tsui','Hung Hom','Ho Man Tin','To Kwa Wan','Sung Wong Toi','Kai Tak','Diamond Hill','Hin Keng','Tai Wai','Che Kung Temple','Sha Tin Wai','City One','Shek Mun','Tai Shui Hang','Heng On','Ma On Shan','Wu Kai Sha']},
  AEL:{nameEn:'Airport Express',nameZh:'機場快綫',color:'#00888A',stations:['Hong Kong','Kowloon','Tsing Yi','Airport','AsiaWorld-Expo']}
};

window.MTR_LINE_MEMBERSHIP = (()=>{
  const m={};
  Object.entries(window.MTR_LINES).forEach(([code,line])=>{
    [line.stations,line.branch,line.race].filter(Boolean).flat().forEach(s=>{(m[s]??=[]).push(code)});
  });
  return m;
})();
