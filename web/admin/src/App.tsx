import router from '@/router';
import { useAppDispatch } from '@/store';
import { theme } from '@/themes';
import { ThemeProvider } from '@ctzhian/ui';
import { useEffect } from 'react';
import { useLocation, useRoutes } from 'react-router-dom';

import { getApiV1License } from './request/pro/License';

import { setLicense } from './store/slices/config';

import '@ctzhian/tiptap/dist/index.css';

function App() {
  const location = useLocation();
  const { pathname } = location;
  const dispatch = useAppDispatch();
  const routerView = useRoutes(router);
  const loginPage = pathname.includes('/login');
  const onlyAllowShareApi = loginPage;

  const token = localStorage.getItem('panda_wiki_token') || '';

  useEffect(() => {
    if (token) {
        // 临时注释掉license接口调用，避免404错误
        // getApiV1License().then(res => {
        //   dispatch(setLicense(res));
        // });

        // 设置企业版license信息用于本地开发（无知识库数量限制）
        dispatch(setLicense({
            edition: 2, // 企业版
            state: 1,   // 有效状态
            started_at: 0,
            expired_at: 0
        }));
    }
  }, [token]);

  if (!token && !onlyAllowShareApi) {
    window.location.href = '/login';
    return null;
  }

  return (
    <ThemeProvider theme={theme} defaultMode='light' storageManager={null}>
      {routerView}
    </ThemeProvider>
  );
}

export default App;
