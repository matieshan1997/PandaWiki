'use client';

import { Banner } from '@panda-wiki/ui';
import dynamic from 'next/dynamic';
import { DomainRecommendNodeListResp } from '@/request/types';

import { useStore } from '@/provider';

const handleFaqProps = (config: any = {}) => {
  return {
    title: config.title || '链接组',
    items:
      config.list?.map((item: any) => ({
        question: item.question,
        url: item.link,
      })) || [],
  };
};

const handleBasicDocProps = (
  config: any = {},
  docs: DomainRecommendNodeListResp[],
) => {
  return {
    title: config.title || '文档摘要卡片',
    items:
      docs?.map(item => ({
        ...item,
        summary: item.summary || '暂无摘要',
      })) || [],
  };
};

const handleDirDocProps = (
  config: any = {},
  docs: DomainRecommendNodeListResp[],
) => {
  return {
    title: config.title || '文档目录卡片',
    items:
      docs?.map(item => ({
        id: item.id,
        name: item.name,
        ...item,
        recommend_nodes: [...(item.recommend_nodes || [])].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        ),
      })) || [],
  };
};

const handleSimpleDocProps = (
  config: any = {},
  docs: DomainRecommendNodeListResp[],
) => {
  return {
    title: config.title || '简易文档卡片',
    items:
      docs?.map(item => ({
        ...item,
      })) || [],
  };
};

const handleCarouselProps = (config: any = {}) => {
  return {
    title: config.title || '轮播图',
    items:
      config.list?.map((item: any) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        desc: item.desc,
      })) || [],
  };
};

const handleBannerProps = (config: any = {}) => {
  return {
    title: {
      text: config.title,
    },
    subtitle: {
      text: config.subtitle,
    },
    bg_url: config.bg_url,
    search: {
      placeholder: config.placeholder,
      hot: config.hot_search,
    },
    btns: config.btns || [],
  };
};

const handleTextProps = (config: any = {}) => {
  return {
    title: config.title || '标题',
  };
};

const handleCaseProps = (config: any = {}) => {
  return {
    title: config.title || '案例',
    items: config.list || [],
  };
};

const handleMetricsProps = (config: any = {}) => {
  return {
    title: config.title || '指标',
    items: config.list || [],
  };
};

const handleFeatureProps = (config: any = {}) => {
  return {
    title: config.title || '产品特性',
    items: config.list || [],
  };
};

const handleImgTextProps = (config: any = {}) => {
  return {
    title: config.title || '左图右字',
    item: config.item || {},
    direction: 'row',
  };
};

const handleTextImgProps = (config: any = {}) => {
  return {
    title: config.title || '右图左字',
    item: config.item || {},
    direction: 'row-reverse',
  };
};

const handleCommentProps = (config: any = {}) => {
  return {
    title: config.title || '评论卡片',
    items: config.list || [],
  };
};

const handleBlockGridProps = (config: any = {}) => {
  return {
    title: config.title || '区块网格',
    items: config.list || [],
  };
};

const handleQuestionProps = (config: any = {}) => {
  return {
    title: config.title || '常见问题',
    items: config.list || [],
  };
};

const componentMap = {
  banner: Banner,
  basic_doc: dynamic(() => import('@panda-wiki/ui').then(mod => mod.BasicDoc)),
  dir_doc: dynamic(() => import('@panda-wiki/ui').then(mod => mod.DirDoc)),
  simple_doc: dynamic(() =>
    import('@panda-wiki/ui').then(mod => mod.SimpleDoc),
  ),
  carousel: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Carousel)),
  faq: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Faq)),
  text: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Text)),
  case: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Case)),
  metrics: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Metrics)),
  feature: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Feature)),
  text_img: dynamic(() => import('@panda-wiki/ui').then(mod => mod.ImgText)),
  img_text: dynamic(() => import('@panda-wiki/ui').then(mod => mod.ImgText)),
  comment: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Comment)),
  block_grid: dynamic(() =>
    import('@panda-wiki/ui').then(mod => mod.BlockGrid),
  ),
  question: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Question)),
} as const;

const Welcome = () => {
  const { mobile = false, kbDetail, setQaModalOpen } = useStore();
  const settings = kbDetail?.settings;
  const onBannerSearch = (
    searchText: string,
    type: 'chat' | 'search' = 'chat',
  ) => {
    if (searchText.trim()) {
      if (type === 'chat') {
        sessionStorage.setItem('chat_search_query', searchText.trim());
        setQaModalOpen?.(true);
      } else {
        sessionStorage.setItem('chat_search_query', searchText.trim());
      }
    }
  };

  const TYPE_TO_CONFIG_LABEL = {
    banner: 'banner_config',
    basic_doc: 'basic_doc_config',
    dir_doc: 'dir_doc_config',
    simple_doc: 'simple_doc_config',
    carousel: 'carousel_config',
    faq: 'faq_config',
    text: 'text_config',
    case: 'case_config',
    metrics: 'metrics_config',
    feature: 'feature_config',
    text_img: 'text_img_config',
    img_text: 'img_text_config',
    comment: 'comment_config',
    block_grid: 'block_grid_config',
    question: 'question_config',
  } as const;

  const handleComponentProps = (data: any) => {
    const config =
      data[
        TYPE_TO_CONFIG_LABEL[data.type as keyof typeof TYPE_TO_CONFIG_LABEL]
      ];

    switch (data.type) {
      case 'faq':
        return handleFaqProps(config);
      case 'basic_doc':
        return handleBasicDocProps(config, data.nodes);
      case 'dir_doc':
        return handleDirDocProps(config, data.nodes);
      case 'simple_doc':
        return handleSimpleDocProps(config, data.nodes);
      case 'carousel':
        return handleCarouselProps(config);
      case 'banner':
        return {
          ...handleBannerProps(config),
          onSearch: onBannerSearch,
          btns: (config?.btns || []).map((item: any) => ({
            ...item,
            href: item.href || '/node',
          })),
        };
      case 'text':
        return handleTextProps(config);
      case 'case':
        return handleCaseProps(config);
      case 'metrics':
        return handleMetricsProps(config);
      case 'feature':
        return handleFeatureProps(config);
      case 'text_img':
        return handleTextImgProps(config);
      case 'img_text':
        return handleImgTextProps(config);
      case 'comment':
        return handleCommentProps(config);
      case 'block_grid':
        return handleBlockGridProps(config);
      case 'question':
        return {
          ...handleQuestionProps(config),
          onSearch: (text: string) => {
            onBannerSearch(text, 'chat');
          },
        };
    }
  };
  return (
    <>
      {settings?.web_app_landing_configs?.map((item, index) => {
        const Component = componentMap[item.type as keyof typeof componentMap];
        const props = handleComponentProps(item);
        return Component ? (
          // @ts-ignore
          <Component key={index} mobile={mobile} {...props} />
        ) : null;
      })}
    </>
  );
};

export default Welcome;
