export interface ServiceDetail {
  id: number;
  name: string;
  category: "coaching" | "repair" | "shop" | "physio" | "fitness" | "food";
  description: string;
  distance: string;
  rating: number;
  reviews: number;
  price: string;
  hours: string;
  image: string;
  featured: boolean;
  phone?: string;
  address?: string;
  repairServices?: { id: string; name: string; price: number; type: "racket" | "shoe" }[];
  demoRackets?: { id: string; model: string; brand: string; weight: string; gripSize: string; availability: "available" | "booked"; deposit: number }[];
  gripOptions?: { id: string; name: string; brand: string; colors: string[] }[];
}

export const marketplaceServices: ServiceDetail[] = [
  {
    id: 1,
    name: "Ace Pickleball Coaching",
    category: "coaching",
    description: "Private & group lessons for all skill levels. IPTPA certified coaches.",
    distance: "0.3 mi",
    rating: 4.9,
    reviews: 127,
    price: "From $45/hr",
    hours: "7am – 8pm",
    image: "🎯",
    featured: true,
    phone: "090-123-4567",
    address: "123 Sunset Blvd, SF"
  },
  {
    id: 2,
    name: "Court Side Pro Shop",
    category: "shop",
    description: "Paddles, balls, shoes, and accessories. Demo paddles available.",
    distance: "0.8 mi",
    rating: 4.7,
    reviews: 89,
    price: "$$",
    hours: "9am – 7pm",
    image: "🏪",
    featured: true,
    demoRackets: [
      { id: "dr-1", model: "Selkirk Vanguard Power Air", brand: "Selkirk", weight: "7.9oz", gripSize: "4 1/4", availability: "available", deposit: 500000 },
      { id: "dr-2", model: "JOOLA Perseus 16mm", brand: "JOOLA", weight: "8.0oz", gripSize: "4 1/8", availability: "available", deposit: 500000 },
      { id: "dr-3", model: "Gearbox Pro Power", brand: "Gearbox", weight: "8.0oz", gripSize: "4 1/4", availability: "booked", deposit: 600000 },
    ],
    gripOptions: [
      { id: "g-1", name: "Tourna Grip", brand: "Tourna", colors: ["#add8e6", "#000000", "white"] },
      { id: "g-2", name: "Wilson Cushion Pro", brand: "Wilson", colors: ["#000000", "#ffffff", "#ff0000"] },
    ]
  },
  {
    id: 3,
    name: "Rally Racket Repair",
    category: "repair",
    description: "Grip replacement, edge guard repair, and paddle resurfacing.",
    distance: "1.2 mi",
    rating: 4.8,
    reviews: 64,
    price: "From $15",
    hours: "10am – 6pm",
    image: "🔧",
    featured: false,
    repairServices: [
      { id: "rs-1", name: "Hàn khung vợt (Carbon repair)", price: 350000, type: "racket" },
      { id: "rs-2", name: "Thay gen vợt (Grommet replacement)", price: 150000, type: "racket" },
      { id: "rs-3", name: "Thay quấn cán (Grip replacement)", price: 50000, type: "racket" },
    ]
  },
  {
    id: 7,
    name: "Sole Survivor Shoe Repair",
    category: "repair",
    description: "Court shoe resoling, cleaning, and custom insoles for players.",
    distance: "1.8 mi",
    rating: 4.4,
    reviews: 41,
    price: "From $25",
    hours: "9am – 5pm",
    image: "👟",
    featured: false,
    repairServices: [
      { id: "ss-1", name: "Dán đế giày (Resoling)", price: 250000, type: "shoe" },
      { id: "ss-2", name: "Khâu viền đế (Stitching)", price: 120000, type: "shoe" },
      { id: "ss-3", name: "Vệ sinh chuyên sâu (Deep Clean)", price: 80000, type: "shoe" },
    ]
  }
];
