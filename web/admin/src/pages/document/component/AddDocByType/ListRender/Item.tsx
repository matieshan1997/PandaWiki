import { ConstsCrawlerSource, postApiV1CrawlerParse } from '@/request';
import { useAppSelector } from '@/store';
import { Ellipsis } from '@ctzhian/ui';
import {
  alpha,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { ListDataItem } from '..';
import StatusBackground from '../components/StatusBackground';
import StatusBadge from '../components/StatusBadge';
import { flattenCrawlerParseResponse } from '../util';
import { IconWenjianjia, IconWenjian } from '@panda-wiki/icons';

interface ListRenderItemProps {
  depth: number;
  data: ListDataItem;
  isSupportSelect: boolean;
  checked: boolean;
  setData: React.Dispatch<React.SetStateAction<ListDataItem[]>>;
  setChecked: React.Dispatch<React.SetStateAction<string[]>>;
}

const ListRenderItem = ({
  data,
  checked,
  depth,
  setData,
  setChecked,
  isSupportSelect,
}: ListRenderItemProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const handlerPullFolder = async () => {
    setLoading(true);
    try {
      const resp = await postApiV1CrawlerParse({
        crawler_source: ConstsCrawlerSource.CrawlerSourceFeishu,
        feishu_setting: {
          space_id: data.id!,
          app_id: data.feishu_setting?.app_id!,
          app_secret: data.feishu_setting?.app_secret!,
          user_access_token: data.feishu_setting?.user_access_token!,
        },
        kb_id,
      });
      setData(prev =>
        prev.map(item =>
          item.uuid === data.uuid ? { ...item, folderReq: true } : item,
        ),
      );
      // 平铺知识库内部数据，parent_id 指向当前知识库
      const flattenedData = flattenCrawlerParseResponse(
        resp,
        data.id, // 使用当前知识库的 id 作为子节点的 parent_id
        {
          space_id: data.id!,
          folderReq: true,
          feishu_setting: data.feishu_setting, // 传递飞书配置
        },
      );
      setData(prev => [...prev, ...flattenedData]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderActions = () => {
    return (
      <Stack direction='row' gap={1} alignItems='center'>
        {!data.file && !data.folderReq && (
          <Button
            size='small'
            color='primary'
            sx={{ p: 0, minWidth: 0 }}
            onClick={handlerPullFolder}
            loading={loading}
          >
            拉取文档
          </Button>
        )}
        {data.progress && data.progress > 0 && data.progress < 100 ? (
          <Stack direction='row' alignItems='center' gap={1}>
            <CircularProgress
              size={12}
              sx={{ color: theme.palette.warning.main }}
            />
            <Box sx={{ fontSize: 12, color: theme.palette.warning.main }}>
              {data.progress}%
            </Box>
          </Stack>
        ) : (
          <StatusBadge status={data.status} />
        )}
      </Stack>
    );
  };

  const handleToggleSelectItem = () => {
    setChecked(prev => {
      if (prev.includes(data.uuid)) {
        return prev.filter(it => it !== data.uuid);
      }
      return [...prev, data.uuid];
    });
  };

  return (
    <ListItem
      sx={{
        p: 0,
        position: 'relative',
        borderBottom: '1px dashed',
        borderColor: 'divider',
        '.MuiListItemButton-root': {
          pr: 12,
        },
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
      secondaryAction={renderActions()}
    >
      <StatusBackground status={data.status} />
      {data.progress && data.progress > 0 && data.progress < 100 && (
        <Box
          sx={{
            width: `${data.progress}%`,
            transition: 'width 0.1s ease',
            height: '100%',
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
      <ListItemButton
        role={undefined}
        onClick={handleToggleSelectItem}
        dense
        sx={{
          p: 0,
          ':hover': {
            bgcolor:
              data.status.includes('error') || data.status === 'imported'
                ? 'transparent'
                : 'background.paper3',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 'auto',
            width: (isSupportSelect ? 70 : 40) + depth * 3 * 8,
            height: 40,
            alignItems: 'center',
          }}
        >
          {isSupportSelect && (
            <Checkbox
              edge='start'
              size='small'
              checked={checked}
              tabIndex={-1}
              disableRipple
              sx={{ ml: '10px' }}
              inputProps={{ 'aria-labelledby': data.uuid }}
            />
          )}
          <Box sx={{ ml: depth * 3 }}>
            {!data.file ? (
              <IconWenjianjia sx={{ fontSize: 14, width: 20, ml: '10px' }} />
            ) : (
              <IconWenjian sx={{ fontSize: 14, width: 20, ml: '10px' }} />
            )}
          </Box>
        </ListItemIcon>
        <ListItemText
          id={data.uuid}
          primary={
            data.title ? (
              <Ellipsis sx={{ fontSize: 14 }}>{data.title}</Ellipsis>
            ) : (
              <Skeleton variant='text' width={200} height={21} />
            )
          }
          secondary={data.summary || ''}
          slotProps={{
            primary: {
              sx: {
                fontSize: 14,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            secondary: {
              sx: {
                fontSize: 12,
                color: data.status.includes('error')
                  ? 'error.main'
                  : 'text.disabled',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default ListRenderItem;
