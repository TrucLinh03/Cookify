import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { Provider } from 'react-redux';
import store from './redux/store';
import SearchPage from './components/SearchPage.jsx';
import CategoryPage from './pages/category/CategoryPage.jsx';
import Home from './pages/home/Home.jsx';
import SingleProduct from './pages/products/SingleProduct.jsx';
import Recipe from './pages/products/Recipe.jsx';
import ErrorPage from './components/ErrorPage.jsx';
import Recommendations from './pages/recommendations/Recommendations.jsx';
import ContactPage from './pages/contact/ContactPage.jsx';
import AboutPage from './pages/about/AboutPage.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageRecipes from './pages/admin/ManageRecipes';
import ManageUsers from './pages/admin/ManageUsers';
import ManageFeedbacks from './pages/admin/ManageFeedbacks';
import ManageBlogs from './pages/admin/ManageBlogs';
import EditProfile from './pages/user/EditProfile.jsx';
import Profile from './pages/user/Profile.jsx';
import Favourite from './pages/user/Favourite.jsx';
import Blog from './pages/blog/Blog.jsx';
import CreateBlog from './pages/blog/CreateBlog.jsx';
import BlogDetail from './pages/blog/BlogDetail.jsx';
import { getApiUrl } from './config/api.js';



const router = createBrowserRouter([
  {
    path: "/",
    element: <App/>,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Home/>,
      },
      {
        path: "/categories/:category",
        element: <CategoryPage />,
      },
      {
        path: "/search",
        element: <SearchPage />,
      },
      {
        path: "/items/:id",
        element: <SingleProduct/>,
        loader: async ({ params }) => {
          try {
            const res = await fetch(getApiUrl(`/api/items/${params.id}`));
            if (!res.ok) {
              throw new Response("Not Found", { status: res.status });
            }
            return res.json();
          } catch (error) {
            throw new Response("Error fetching item", { status: 500 });
          }
        }
      },
      {
        path: "/recipes",
        element: <Recipe/>
      },
      {
        path: "/recommendations",
        element: <Recommendations/>
      },
      {
        path: "/contact",
        element: <ContactPage/>
      },
      {
        path: "/about",
        element: <AboutPage/>
      },
      {
        path: "/blog",
        element: <Blog/>
      },
      {
        path: "/blog/create",
        element: <CreateBlog/>
      },
      {
        path: "/blog/:id",
        element: <BlogDetail/>
      },
      { path: "/login", element: <Login/> },
      { path: "/register", element: <Register/> },
      { path: "/dashboard/admin", element: <AdminDashboard /> },
      { path: "/dashboard/recipes", element: <ManageRecipes /> },
      { path: "/dashboard/users", element: <ManageUsers /> },
      { path: "/dashboard/feedbacks", element: <ManageFeedbacks /> },
      { path: "/dashboard/blogs", element: <ManageBlogs /> },
      {
        path: "/recipes/:id",
        element: <SingleProduct/>,
        loader: async ({ params }) => {
          const response = await fetch(getApiUrl(`/api/recipes/${params.id}`));
          if (!response.ok) {
            throw new Error('Không tải được công thức');
          }
          return response.json();
        },
      },
      {
        path: "/profile",
        element: <Profile/>,
      },
      {
        path: "/favourites",
        element: <Favourite/>,
      },
      {
        path: "/edit-profile",
        element: <EditProfile/>,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
)
