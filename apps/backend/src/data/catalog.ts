import { CatalogData } from '../types.js';

export const seedCatalog: CatalogData = {
  updatedAt: 'Bugün 19:40',
  highlights: {
    summerTrend: '%38 daha fazla oda aktivitesi',
    activeRideCities: 'İstanbul, İzmir, Antalya, Bursa',
    answeredQuestions: 'Bu hafta 412 soru cevaplandı'
  },
  brands: [
    { id: 'honda', name: 'Honda', subtitle: 'Scooter ve commuter odaları', accent: '#E34A2F' },
    { id: 'yamaha', name: 'Yamaha', subtitle: 'Naked ve maxi scooter akışı', accent: '#2257F5' },
    { id: 'ktm', name: 'KTM', subtitle: 'Street ve performans odaları', accent: '#FF7A00' },
    { id: 'bmw', name: 'BMW', subtitle: 'Touring ve adventure toplulukları', accent: '#1D4ED8' }
  ],
  rooms: [
    {
      id: 'honda-pcx-125',
      brandId: 'honda',
      modelName: 'PCX 125',
      segment: 'Urban Scooter',
      engine: '125 cc',
      memberCount: 2840,
      ridersOnline: 148,
      archivedMessageCount: 12480,
      cityFocus: 'İstanbul / Kadıköy',
      description: 'Şehir içi kullanım, yakıt tüketimi, arka amortisör ve bakım periyodu konuşuluyor.',
      seasonNote: 'Yaz aylarında buluşma ve rota konusu ciddi artıyor.',
      tags: ['yakıt', 'bakım', 'yağ', 'aksesuar'],
      pinnedInsights: [
        { title: 'Kronik Not', detail: 'Arka amortisör sertliği ve trim sesleri en çok açılan başlık.' },
        { title: 'Tavsiye', detail: 'Sık stop-start yapan kullanıcılar için CVT bakım takibi sabitlenmiş durumda.' }
      ],
      meetups: [
        { id: 'pcx-ride-1', city: 'İstanbul', dateLabel: 'Cumartesi 21:00', title: 'Sahil turu ve kahve buluşması', attendees: 17 },
        { id: 'pcx-ride-2', city: 'Kocaeli', dateLabel: 'Pazar 10:00', title: 'Körfez mini rota', attendees: 11 }
      ],
      messages: [
        {
          id: 'pcx-msg-1',
          authorName: 'Mert',
          city: 'Kadıköy',
          role: 'Sürücü',
          body: '2023 kasa PCX’te 70-80 km/h aralığında hafif gidon titreşimi yaşayan var mı? Balans sonrası azaldı ama tamamen gitmedi.',
          relativeTime: '6 dk önce',
          helpfulCount: 12,
          pinned: true
        },
        {
          id: 'pcx-msg-2',
          authorName: 'Tuna Usta',
          city: 'Ümraniye',
          role: 'Usta',
          body: 'Ön lastik basıncı ve arka varyatör kapağı kontrolüyle beraber bakın. Geçen hafta aynı semptom 2 motorda oradan çıktı.',
          relativeTime: '15 dk önce',
          helpfulCount: 21
        }
      ]
    },
    {
      id: 'honda-cbr250r',
      brandId: 'honda',
      modelName: 'CBR250R',
      segment: 'Sport Commuter',
      engine: '250 cc',
      memberCount: 1180,
      ridersOnline: 62,
      archivedMessageCount: 6980,
      cityFocus: 'Ankara / Çankaya',
      description: 'Tek silindir bakım, zincir-ses, uzun yol ve günlük kullanım dengesi konuşuluyor.',
      seasonNote: 'Yazın şehir dışı rota ve ekipman başlıkları öne çıkıyor.',
      tags: ['zincir', 'uzun yol', 'egzoz', 'lastik'],
      pinnedInsights: [
        { title: 'Sabit Bilgi', detail: 'Rölanti düzensizliği başlığında throttle body temizliği en çok önerilen çözüm.' },
        { title: 'Topluluk Kuralı', detail: 'Satılık içerikleri sadece haftalık ilan penceresinde açılıyor.' }
      ],
      meetups: [
        { id: 'cbr-ride-1', city: 'Ankara', dateLabel: 'Cuma 20:30', title: 'Eskişehir yolu kısa akşam sürüşü', attendees: 9 }
      ],
      messages: [
        {
          id: 'cbr-msg-1',
          authorName: 'Baran',
          city: 'Ankara',
          role: 'Sürücü',
          body: '14 diş ön dişliye geçen oldu mu? Şehir içinde toparlıyor ama uzun yolda fazla bağırır mı diye kararsızım.',
          relativeTime: '12 dk önce',
          helpfulCount: 8
        },
        {
          id: 'cbr-msg-2',
          authorName: 'Onur',
          city: 'Etimesgut',
          role: 'Sürücü',
          body: 'Uzun yola çıkıyorsan 14 yerine bakım ve zincir setini yenilemek daha mantıklı, ben öyle çözdüm.',
          relativeTime: '40 dk önce',
          helpfulCount: 11
        }
      ]
    },
    {
      id: 'yamaha-mt-07',
      brandId: 'yamaha',
      modelName: 'MT-07',
      segment: 'Naked',
      engine: '689 cc',
      memberCount: 1975,
      ridersOnline: 104,
      archivedMessageCount: 9322,
      cityFocus: 'İzmir / Bornova',
      description: 'Egzoz, quickshifter, lastik seçimi ve şehir içi / hafta sonu rota dengesi öne çıkıyor.',
      seasonNote: 'Sıcak havada akşam sürüşleri ve toplu kalkışlar bu odada çok hızlı doluyor.',
      tags: ['lastik', 'eksoz', 'sürüş', 'buluşma'],
      pinnedInsights: [
        { title: 'Kronik Not', detail: 'Radyatör koruma ve kısa kuyruk kitlerinde titreşim şikayetleri tekrar ediyor.' },
        { title: 'Top Cevap', detail: 'Yeni başlayan MT-07 sürücüleri için gaz yönetimi rehberi moderatör notlarında.' }
      ],
      meetups: [
        { id: 'mt07-ride-1', city: 'İzmir', dateLabel: 'Cumartesi 07:00', title: 'Foça sabah sürüşü', attendees: 24 },
        { id: 'mt07-ride-2', city: 'Manisa', dateLabel: 'Pazar 09:30', title: 'Spil kısa rota', attendees: 15 }
      ],
      messages: [
        {
          id: 'mt07-msg-1',
          authorName: 'Kaan',
          city: 'Bornova',
          role: 'Sürücü',
          body: 'Road 6 mı S22 mi? Daha çok şehir içi ama ayda 2 kere kıvrak rota yapıyorum. Isınma süresi önemli.',
          relativeTime: '4 dk önce',
          helpfulCount: 16,
          pinned: true
        },
        {
          id: 'mt07-msg-2',
          authorName: 'Mina',
          city: 'Karşıyaka',
          role: 'Sürücü',
          body: 'Ben Road 6 ile günlükte çok rahat ettim. S22 daha keyifli ama kullanım senaryosunda çabuk bitebilir.',
          relativeTime: '22 dk önce',
          helpfulCount: 14
        }
      ]
    },
    {
      id: 'yamaha-nmax-155',
      brandId: 'yamaha',
      modelName: 'NMAX 155',
      segment: 'Maxi Scooter',
      engine: '155 cc',
      memberCount: 1634,
      ridersOnline: 81,
      archivedMessageCount: 8452,
      cityFocus: 'Bursa / Nilüfer',
      description: 'Şehir kullanımında konfor, sele, yağ ve kayış değişim takvimi ağırlıklı konuşuluyor.',
      seasonNote: 'Yazın ekipman + günlük rota kombinasyonu çok daha hareketleniyor.',
      tags: ['sele', 'kayış', 'konfor', 'usta'],
      pinnedInsights: [
        { title: 'Sabit Bilgi', detail: 'Kayış değişim kilometresi için kullanıcı anket sonucu özet tabloda duruyor.' },
        { title: 'Topluluk Notu', detail: 'Bursa ve Yalova kısa sürüş planları haftalık olarak açılıyor.' }
      ],
      meetups: [
        { id: 'nmax-ride-1', city: 'Bursa', dateLabel: 'Pazar 18:00', title: 'Mudanya gün batımı turu', attendees: 13 }
      ],
      messages: [
        {
          id: 'nmax-msg-1',
          authorName: 'Selim',
          city: 'Nilüfer',
          role: 'Sürücü',
          body: 'Uzun boy için sele yükseltme yaptıran varsa usta önerisi alabilirim.',
          relativeTime: '18 dk önce',
          helpfulCount: 7
        },
        {
          id: 'nmax-msg-2',
          authorName: 'Ceren',
          city: 'Osmangazi',
          role: 'Sürücü',
          body: 'Ben jel sele yaptırdım, şehir içinde fark etti ama artçı için biraz sert kaldı.',
          relativeTime: '51 dk önce',
          helpfulCount: 9
        }
      ]
    },
    {
      id: 'ktm-duke-390',
      brandId: 'ktm',
      modelName: 'Duke 390',
      segment: 'Street',
      engine: '399 cc',
      memberCount: 894,
      ridersOnline: 43,
      archivedMessageCount: 4310,
      cityFocus: 'Antalya / Muratpaşa',
      description: 'Fan açma sıcaklığı, titreşim ve performans parçaları burada dönüyor.',
      seasonNote: 'Sahil sürüşü ve akşam buluşmaları bu odanın yaz ritmini belirliyor.',
      tags: ['hararet', 'titreşim', 'ecu', 'rota'],
      pinnedInsights: [
        { title: 'Kronik Not', detail: 'Yoğun trafikte fan açma davranışı en çok sorulan konu, sabitlenmiş açıklama mevcut.' },
        { title: 'Bakım', detail: 'Servis dışı parça kullanımında garanti etkisi için topluluk rehberi yukarıda.' }
      ],
      meetups: [
        { id: 'duke-ride-1', city: 'Antalya', dateLabel: 'Cumartesi 22:00', title: 'Konyaaltı gece turu', attendees: 12 }
      ],
      messages: [
        {
          id: 'duke-msg-1',
          authorName: 'Alper',
          city: 'Antalya',
          role: 'Sürücü',
          body: '37 derecede şehir içinde fan çok sık açıyor, bu kasa için normal aralık kaç derecede sizde?',
          relativeTime: '8 dk önce',
          helpfulCount: 10
        }
      ]
    },
    {
      id: 'bmw-r1250gs',
      brandId: 'bmw',
      modelName: 'R 1250 GS',
      segment: 'Adventure Touring',
      engine: '1254 cc',
      memberCount: 742,
      ridersOnline: 39,
      archivedMessageCount: 5120,
      cityFocus: 'İstanbul / Beşiktaş',
      description: 'Uzun yol setup, yan çanta, lastik ve servis deneyimi odanın ana konusu.',
      seasonNote: 'İlkbahar ve yazda rota planları haftalık takvime dönüyor.',
      tags: ['uzun yol', 'servis', 'çanta', 'rota'],
      pinnedInsights: [
        { title: 'Top Cevap', detail: 'Anadolu turu setup listesi moderatör mesajlarında sabit.' },
        { title: 'Sabit Bilgi', detail: 'Servis maliyeti ve parça bekleme süreleri için kullanıcı tablosu güncel.' }
      ],
      meetups: [
        { id: 'gs-ride-1', city: 'İstanbul', dateLabel: 'Pazar 08:30', title: 'Şile kahvaltı rotası', attendees: 18 }
      ],
      messages: [
        {
          id: 'gs-msg-1',
          authorName: 'Yiğit',
          city: 'Levent',
          role: 'Sürücü',
          body: 'Anadolu turu için Anakee Adventure mı Trailmax Mission mı daha mantıklı, asfalt oranı yüksek olacak.',
          relativeTime: '14 dk önce',
          helpfulCount: 9
        },
        {
          id: 'gs-msg-2',
          authorName: 'Emre',
          city: 'Sarıyer',
          role: 'Sürücü',
          body: 'Asfalt çoğunluksa Anakee daha mantıklı. Mission uzun ömürlü ama yolda biraz daha gürültülü.',
          relativeTime: '33 dk önce',
          helpfulCount: 12
        }
      ]
    }
  ]
};
