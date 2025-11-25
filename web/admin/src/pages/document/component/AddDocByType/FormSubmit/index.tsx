import { ConstsCrawlerSource, postApiV1CrawlerParse } from '@/request';
import { message } from '@ctzhian/ui';
import { Button, Stack } from '@mui/material';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ListDataItem } from '..';
import { TYPE_CONFIG } from '../constants';
import { useGlobalQueue } from '../hooks/useGlobalQueue';
import { flattenCrawlerParseResponse, validateFormData } from '../util';
import FormInput from './FormInput';

interface FormSubmitProps {
  type: ConstsCrawlerSource;
  kb_id: string;
  parent_id: string | null;
  setData: React.Dispatch<React.SetStateAction<ListDataItem[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  queue: ReturnType<typeof useGlobalQueue>;
}

type FormData = {
  app_id?: string;
  app_secret?: string;
  user_access_token?: string;
  url?: string;
};

const FormSubmit = ({
  type,
  kb_id,
  setData,
  parent_id,
  loading,
  setLoading,
  queue,
}: FormSubmitProps) => {
  const [formData, setFormData] = useState<FormData>({
    app_id: '',
    app_secret: '',
    user_access_token: '',
    url: '',
  });

  const handleSubmitForm = useCallback(async () => {
    const validation = validateFormData(formData, type);
    if (!validation.isValid) {
      message.error(validation.errorMessage);
      return;
    }
    setLoading(true);

    try {
      switch (type) {
        case ConstsCrawlerSource.CrawlerSourceUrl: {
          const urls = formData.url?.split('\n').filter(u => u.trim()) || [];

          // 创建url到uuid的映射
          const urlToUuidMap = new Map<string, string>();
          const newItems: ListDataItem[] = urls.map(url => {
            const uuid = uuidv4();
            urlToUuidMap.set(url, uuid);
            return {
              uuid,
              task_id: '',
              parent_id: parent_id || '',
              platform_id: '',
              id: url,
              title: url,
              summary: '',
              status: 'parsing',
              file: true,
              open: false,
            } as ListDataItem;
          });

          // 先添加所有解析中的项
          setData(prev => [...prev, ...newItems]);

          // 使用队列控制并发请求所有url
          await Promise.all(
            urls.map(url =>
              queue.enqueue(async () => {
                const itemUuid = urlToUuidMap.get(url)!;
                try {
                  const resp = await postApiV1CrawlerParse({
                    crawler_source: type,
                    key: url,
                    kb_id,
                  });
                  // 更新对应的item，而不是添加新item
                  setData(prev =>
                    prev.map(item =>
                      item.uuid === itemUuid
                        ? {
                            ...item,
                            platform_id: resp.id!,
                            id: resp.docs?.value?.id || '',
                            title: resp.docs?.value?.title || url,
                            summary: resp.docs?.value?.summary || '',
                            status: 'parsed',
                          }
                        : item,
                    ),
                  );
                } catch (error) {
                  // 更新为错误状态
                  setData(prev =>
                    prev.map(item =>
                      item.uuid === itemUuid
                        ? {
                            ...item,
                            status: 'parse-error',
                            summary:
                              error instanceof Error
                                ? error.message
                                : '操作失败，请稍后重试',
                          }
                        : item,
                    ),
                  );
                }
              }),
            ),
          );
          break;
        }
        case ConstsCrawlerSource.CrawlerSourceRSS:
        case ConstsCrawlerSource.CrawlerSourceSitemap:
        case ConstsCrawlerSource.CrawlerSourceNotion: {
          const resp = await postApiV1CrawlerParse({
            crawler_source: type,
            key: formData.url!,
            kb_id,
          });
          const flattenedData = flattenCrawlerParseResponse(resp, parent_id);
          setData(prev => [...prev, ...flattenedData]);
          break;
        }
        case ConstsCrawlerSource.CrawlerSourceFeishu: {
          const resp = await postApiV1CrawlerParse({
            crawler_source: type,
            feishu_setting: {
              app_id: formData.app_id!,
              app_secret: formData.app_secret!,
              user_access_token: formData.user_access_token!,
            },
            kb_id,
          });

          // 创建"我的文件夹"根节点
          const myfolder: ListDataItem = {
            uuid: uuidv4(),
            task_id: '',
            parent_id: parent_id || '',
            platform_id: resp.id || '',
            id: 'cloud_disk',
            title: '飞书云盘',
            summary: 'cloud_disk',
            file: false,
            status: 'parsed',
            open: true,
            folderReq: false,
            feishu_setting: {
              app_id: formData.app_id!,
              app_secret: formData.app_secret!,
              user_access_token: formData.user_access_token!,
            },
          };

          // 使用工具函数平铺知识库列表数据，parent_id 指向 myfolder
          const children = flattenCrawlerParseResponse(resp, parent_id, {
            folderReq: false,
            feishu_setting: {
              app_id: formData.app_id!,
              app_secret: formData.app_secret!,
              user_access_token: formData.user_access_token!,
            },
          });

          setData([myfolder, ...children]);
          break;
        }
        default: {
          break;
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, [formData, type, kb_id, parent_id, queue]);

  return (
    <>
      <FormInput type={type} formData={formData} onChange={setFormData} />
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{ mt: 2 }}
      >
        {TYPE_CONFIG[type].usage && (
          <Button
            component='a'
            href={TYPE_CONFIG[type].usage}
            target='_blank'
            sx={{
              fontSize: 14,
              fontWeight: 'normal',
              color: 'primary.main',
            }}
          >
            使用方法
          </Button>
        )}
        <Button
          variant='contained'
          loading={loading}
          onClick={handleSubmitForm}
        >
          {TYPE_CONFIG[type].okText || '拉取数据'}
        </Button>
      </Stack>
    </>
  );
};

export default FormSubmit;
