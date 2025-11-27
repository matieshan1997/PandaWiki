import { useState, useRef, useEffect } from 'react';
import { Box, Stepper, Step, StepLabel } from '@mui/material';
import { Modal, message } from '@ctzhian/ui';
import { useLocation } from 'react-router-dom';
import {
  setKbC,
  setIsRefreshDocList,
  setIsCreateWikiModalOpen,
} from '@/store/slices/config';
import { useAppSelector, useAppDispatch } from '@/store';
import { postApiV1KnowledgeBaseRelease } from '@/request/KnowledgeBase';
import {
  Step1Model,
  Step2Config,
  Step3Import,
  Step4Publish,
  Step5Test,
  Step6Decorate,
  Step7Complete,
} from './steps';
import dayjs from 'dayjs';
import { INIT_LADING_DATA } from './steps/initData';
import { getApiV1AppDetail, putApiV1App } from '@/request/App';

// Remove interface as we're using Redux state

const steps = [
  '模型配置',
  '配置监听',
  // '录入文档',
  // '发布内容',
  // '问答测试',
  // '装饰页面',
  '完成配置',
];

const CreateWikiModal = () => {
  const { kb_c, kb_id, kbList } = useAppSelector(state => state.config);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const Step1ModelRef = useRef<{ onSubmit: () => Promise<void> }>(null);
  const step2ConfigRef = useRef<{ onSubmit: () => Promise<void> }>(null);
  const step3ImportRef = useRef<{
    onSubmit: () => Promise<Record<'id', string>[]>;
  }>(null);
  const step6DecorateRef = useRef<{ onSubmit: () => Promise<void> }>(null);

  const onCancel = () => {
    dispatch(setKbC(false));
    setOpen(false);
    if (location.pathname === '/') {
      dispatch(setIsRefreshDocList(true));
    }
  };

  const onPublish = () => {
    return postApiV1KnowledgeBaseRelease({
      kb_id,
      message: '创建 Wiki 站点',
      tag: `${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substring(2, 8)}`,
      node_ids: nodeIds,
    });
  };

  // 装饰页面逻辑：应用初始化配置
  const applyDecorateSettings = (targetKbId?: string) => {
    // 使用传入的 kb_id 或从 Redux store 获取
    const currentKbId = targetKbId || kb_id;

    console.log('🎨 开始应用装饰配置...');
    console.log('📦 INIT_LADING_DATA:', INIT_LADING_DATA);
    console.log('🆔 kb_id:', currentKbId);

    if (!currentKbId) {
      console.error('❌ kb_id 为空，无法应用装饰配置');
      return Promise.reject(new Error('kb_id 为空'));
    }

    return getApiV1AppDetail({
      kb_id: currentKbId,
      type: '1',
    })
      .then(res => {
        console.log('✅ 获取到 App 详情:', res);

        const newSettings = {
          ...res.settings,
          ...INIT_LADING_DATA,
          // 深度合并 footer_settings，保留原有的 corp_name 和 icp
          footer_settings: {
            ...res.settings?.footer_settings,
            ...INIT_LADING_DATA.footer_settings,
            // 如果 INIT_LADING_DATA 中的值为空，则保留原有值
            corp_name:
              INIT_LADING_DATA.footer_settings.corp_name ||
              res.settings?.footer_settings?.corp_name ||
              '',
            icp:
              INIT_LADING_DATA.footer_settings.icp ||
              res.settings?.footer_settings?.icp ||
              '',
          },
          web_app_landing_configs: INIT_LADING_DATA.web_app_landing_configs.map(
            item => {
              if (item.type === 'basic_doc') {
                return {
                  ...item,
                  node_ids: nodeIds,
                };
              }
              return item;
            },
          ),
        };

        console.log('🔧 新的 settings:', newSettings);

        return putApiV1App(
          { id: res.id! },
          {
            kb_id: currentKbId,
            settings: newSettings,
          },
        ).then(updateRes => {
          console.log('✅ 装饰配置应用成功:', updateRes);
          return updateRes;
        });
      })
      .catch(error => {
        console.error('❌ 应用装饰配置失败:', error);
        throw error;
      });
  };

  const handleNext = () => {
    if (activeStep === 0) {
      setLoading(true);
      Step1ModelRef.current
        ?.onSubmit?.()
        .then(() => {
          setActiveStep(prev => prev + 1);
        })
        .catch(error => {
          message.error(error.message || '模型配置验证失败');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (activeStep === 1) {
      setLoading(true);
      step2ConfigRef.current
        ?.onSubmit?.()
        .then(() => {
          // 配置监听完成后，从 localStorage 获取最新的 kb_id
          const latestKbId = localStorage.getItem('kb_id') || '';
          console.log('📍 从 localStorage 获取的 kb_id:', latestKbId);

          // 配置监听完成后，自动执行装饰页面逻辑
          return applyDecorateSettings(latestKbId);
        })
        .then(() => {
          setActiveStep(prev => prev + 1);
        })
        .catch(error => {
          console.error('应用装饰配置失败:', error);
          // 即使装饰配置失败，也继续下一步
          setActiveStep(prev => prev + 1);
        })
        .finally(() => {
          setLoading(false);
        });
    }
    // else if (activeStep === 2) {
    //   setLoading(true);
    //   step3ImportRef.current
    //     ?.onSubmit?.()
    //     .then(res => {
    //       setNodeIds(res.map(item => item.id));
    //       setActiveStep(prev => prev + 1);
    //     })
    //     .finally(() => {
    //       setLoading(false);
    //     });
    // } else if (activeStep === 3) {
    //   setLoading(true);
    //   onPublish().finally(() => {
    //     setActiveStep(prev => prev + 1);
    //     setLoading(false);
    //   });
    // } else if (activeStep === 4) {
    //   setActiveStep(prev => prev + 1);
    // }
    // else if (activeStep === 2) {
    //   setLoading(true);
    //   step6DecorateRef.current
    //     ?.onSubmit?.()
    //     .then(() => {
    //       setActiveStep(prev => prev + 1);
    //     })
    //     .finally(() => {
    //       setLoading(false);
    //     });
    // }
    else if (activeStep === 2) {
      onCancel();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <Step1Model ref={Step1ModelRef} />;
      case 1:
        return <Step2Config ref={step2ConfigRef} />;
      // case 2:
      //   return <Step3Import ref={step3ImportRef} />;
      // case 3:
      //   return <Step4Publish />;
      // case 4:
      //   return <Step5Test />;
      // case 2:
      //   return <Step6Decorate ref={step6DecorateRef} nodeIds={nodeIds} />;
      case 2:
        return <Step7Complete />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setNodeIds([]);
        setActiveStep(0);
      }, 300);
    }
    dispatch(setIsCreateWikiModalOpen(open));
  }, [open]);

  useEffect(() => {
    setOpen(kb_c);
  }, [kb_c]);

  useEffect(() => {
    if (kbList?.length === 0) setOpen(true);
  }, [kbList]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title='创建 Wiki 站点'
      width={880}
      closable={activeStep === 0 && (kbList || []).length > 0}
      showCancel={false}
      okText={activeStep === steps.length - 1 ? '关闭' : '下一步'}
      // cancelText='上一步'
      okButtonProps={{ loading }}
      onOk={handleNext}
    >
      <Box sx={{ display: 'flex', minHeight: 300 }}>
        <Box
          sx={{
            width: '140px',
            borderRight: '1px solid',
            borderColor: 'divider',
            pl: '16px',
            pr: 5,
            flexShrink: 0,
          }}
        >
          <Stepper
            activeStep={activeStep}
            orientation='vertical'
            sx={{
              '& .MuiStepLabel-root': {
                padding: '2px 0',
              },
              '& .MuiStepLabel-label': {
                fontSize: '14px',
                ml: 1,
              },
              '.MuiStepLabel-iconContainer': {
                '.Mui-completed ': {
                  fontSize: 0,
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                },
              },
              '.MuiStepConnector-root': {
                ml: '5px',
              },

              '.MuiStepIcon-root': {
                fontSize: '10px',
                color: 'rgba(23,28,25,0.3)',
                '&.Mui-active': {
                  color: 'primary.main',
                },
                '.MuiStepIcon-text': {
                  fontSize: 0,
                },
              },
              '& .MuiStepConnector-line': {
                borderColor: 'divider',
              },
            }}
          >
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: index === activeStep ? 'text.primary' : '#717572',
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ flex: 1, pl: 5 }}>{renderStepContent()}</Box>
      </Box>
    </Modal>
  );
};

export default CreateWikiModal;
