import { AppConfig, Style } from "../types";

export const APP_CONFIG: AppConfig = {
  brandName: "H2O STUDIO",
  zaloUrl: "https://zalo.me/0979514059",
  facebookMessengerUrl: "https://m.me/Chupanhcuoi.depnhatHaiphong.H2ostudio",
  hotline: "0979514059",
  description: "Thư viện Ảnh Cưới Concept giúp bạn chọn đúng concept phù hợp trước khi tư vấn layout."
};

const generatePhotos = (albumId: string, count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${albumId}-photo-${i + 1}`,
    image: `https://picsum.photos/seed/${albumId}-${i + 1}/800/1200`,
    alt: `Photo ${i + 1} for ${albumId}`,
    order: i
  }));
};

export const STYLES: Style[] = [
  {
    id: "studio-concept",
    slug: "studio-concept",
    title: "Studio Concept",
    description: "Nhẹ nhàng, tinh tế, hiện đại",
    coverImage: "https://picsum.photos/seed/korean-cover/600/900",
    order: 0,
    albums: [
      {
        id: "nang-tho-anh-sang",
        slug: "nang-tho-anh-sang",
        title: "Nàng thơ ánh sáng",
        description: "Concept mềm mại, trong trẻo, phù hợp cô dâu thích vẻ nhẹ nhàng, tự nhiên.",
        coverImage: "https://picsum.photos/seed/muse-light/600/900",
        order: 0,
        photos: generatePhotos("nang-tho-anh-sang", 15)
      },
      {
        id: "toi-gian-sang-trong",
        slug: "toi-gian-sang-trong",
        title: "Tối giản sang trọng",
        description: "Vẻ đẹp vượt thời gian với phông nền trơn và ánh sáng studio cao cấp.",
        coverImage: "https://picsum.photos/seed/minimal-luxury/600/900",
        order: 1,
        photos: generatePhotos("toi-gian-sang-trong", 12)
      },
      {
        id: "thanh-lich-co-dien",
        slug: "thanh-lich-co-dien",
        title: "Thanh lịch cổ điển",
        description: "Sự kết hợp giữa nét cổ điển và hơi thở hiện đại.",
        coverImage: "https://picsum.photos/seed/classic-elegant/600/900",
        order: 2,
        photos: generatePhotos("thanh-lich-co-dien", 14)
      }
    ]
  },
  {
    id: "cong-chua-concept",
    slug: "cong-chua-concept",
    title: "Công Chúa Concept",
    description: "Lộng lẫy, kiêu sa, cổ tích",
    coverImage: "https://picsum.photos/seed/princess-cover/600/900",
    order: 1,
    albums: [
      {
        id: "giac-mo-co-tich",
        slug: "giac-mo-co-tich",
        title: "Giấc mơ cổ tích",
        description: "Váy bồng bềnh, bối cảnh lâu đài lãng mạn.",
        coverImage: "https://picsum.photos/seed/fairy-dream/600/900",
        order: 0,
        photos: generatePhotos("giac-mo-co-tich", 15)
      },
      {
        id: "hoang-gia-sang-trong",
        slug: "hoang-gia-sang-trong",
        title: "Hoàng gia sang trọng",
        description: "Đẳng cấp và quyền quý trong từng khung hình.",
        coverImage: "https://picsum.photos/seed/royal-luxury/600/900",
        order: 1,
        photos: generatePhotos("hoang-gia-sang-trong", 13)
      }
    ]
  },
  {
    id: "truyen-thong-concept",
    slug: "truyen-thong-concept",
    title: "Truyền Thống Concept",
    description: "Đậm chất Á Đông, quyến rũ",
    coverImage: "https://picsum.photos/seed/chinese-cover/600/900",
    order: 2,
    albums: [
      {
        id: "tan-co-dien",
        slug: "tan-co-dien",
        title: "Tân cổ dien Trung Hoa",
        description: "Sự giao thoa giữa truyền thống và phong cách thời trang mới.",
        coverImage: "https://picsum.photos/seed/neo-chinese/600/900",
        order: 0,
        photos: generatePhotos("tan-co-dien", 12)
      },
      {
        id: "hong-kong-vibe",
        slug: "hong-kong-vibe",
        title: "Hong Kong Vibe",
        description: "Màu sắc điện ảnh, hoài cổ và đầy cá tính.",
        coverImage: "https://picsum.photos/seed/hk-vibe/600/900",
        order: 1,
        photos: generatePhotos("hong-kong-vibe", 15)
      }
    ]
  },
  {
    id: "studio-noi-thanh-concept",
    slug: "studio-noi-thanh-concept",
    title: "Studio Nội Thành Concept",
    description: "Tự do, phóng khoáng, phố thị",
    coverImage: "https://picsum.photos/seed/city-cover/600/900",
    order: 3,
    albums: [
      {
        id: "dao-pho-sai-gon",
        slug: "dao-pho-sai-gon",
        title: "Dạo phố Sài Gòn",
        description: "Ghi lại những khoảnh khắc tự nhiên nhất giữa lòng thành phố.",
        coverImage: "https://picsum.photos/seed/saigon-street/600/900",
        order: 0,
        photos: generatePhotos("dao-pho-sai-gon", 14)
      },
      {
        id: "hoang-hon-tren-bien",
        slug: "hoang-hon-tren-bien",
        title: "Hoàng hôn trên biển",
        description: "Lãng mạn và bình yên dưới ánh nắng chiều tà.",
        coverImage: "https://picsum.photos/seed/beach-sunset/600/900",
        order: 1,
        photos: generatePhotos("hoang-hon-tren-bien", 15)
      }
    ]
  }
];
