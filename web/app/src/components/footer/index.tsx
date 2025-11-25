'use client';
import { useStore } from '@/provider';
import { useMemo } from 'react';

import {
  Footer,
  WelcomeFooter as WelcomeFooterComponent,
} from '@panda-wiki/ui';

export const FooterProvider = ({
  showBrand = true,
  isDocPage = false,
  isWelcomePage = false,
}: {
  showBrand?: boolean;
  isDocPage?: boolean;
  isWelcomePage?: boolean;
}) => {
  const { mobile = false, catalogWidth, kbDetail } = useStore();

  const docWidth = useMemo(() => {
    if (isWelcomePage) return 'full';
    return kbDetail?.settings?.theme_and_style?.doc_width || 'full';
  }, [kbDetail, isWelcomePage]);
  const footerSetting = kbDetail?.settings?.footer_settings;
  const customStyle = kbDetail?.settings?.web_app_custom_style;

  return (
    <Footer
      mobile={mobile}
      catalogWidth={catalogWidth}
      showBrand={showBrand}
      isDocPage={isDocPage}
      logo='https://release.baizhi.cloud/panda-wiki/icon.png'
      docWidth={docWidth}
      footerSetting={footerSetting || undefined}
      customStyle={customStyle}
    />
  );
};

export const WelcomeFooter = ({
  showBrand = true,
}: {
  showBrand?: boolean;
}) => {
  const { mobile = false, catalogWidth, kbDetail } = useStore();
  const footerSetting = kbDetail?.settings?.footer_settings;
  const customStyle = kbDetail?.settings?.web_app_custom_style;
  return (
    <WelcomeFooterComponent
      mobile={mobile}
      catalogWidth={catalogWidth}
      showBrand={showBrand}
      isDocPage={false}
      logo='https://release.baizhi.cloud/panda-wiki/icon.png'
      docWidth='full'
      footerSetting={footerSetting || undefined}
      customStyle={customStyle}
    />
  );
};

export default Footer;
