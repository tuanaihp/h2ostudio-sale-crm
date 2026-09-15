import React from 'react';
import { Layout } from '../components/Layout';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

const NotFound: React.FC = () => (
  <Layout title="Không tìm thấy trang">
    <Helmet>
      <title>404 - H2O STUDIO</title>
      <meta name="robots" content="noindex" />
    </Helmet>
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Compass className="w-10 h-10 text-gray-300" />
      </div>
      <h1 className="text-6xl font-black text-dark/10 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-dark mb-2">Không tìm thấy trang</h2>
      <p className="text-dark/60 max-w-md mb-8">
        Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển.
      </p>
      <Link
        to="/"
        className="px-8 py-3 bg-dark text-white rounded-full font-medium hover:bg-dark/90 transition-colors"
      >
        Về trang chủ
      </Link>
    </div>
  </Layout>
);

export default NotFound;
