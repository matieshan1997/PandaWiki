import { useEffect, useState } from 'react';
import {
  postApiProV1AuthGroupCreate,
  patchApiProV1AuthGroupUpdate,
} from '@/request/pro/AuthGroup';
import { TextField, Box, Stack } from '@mui/material';
import dayjs from 'dayjs';
import { Modal, Table, message } from '@ctzhian/ui';
import NoData from '@/assets/images/nodata.png';
import { useForm, Controller } from 'react-hook-form';
import { FormItem } from './Common';
import { useAppSelector } from '@/store';
import { ColumnType } from '@ctzhian/ui/dist/Table';
import {
  GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem,
  GithubComChaitinPandaWikiProApiAuthV1AuthItem,
} from '@/request/pro/types';

interface UserGroupModalProps {
  data?: GithubComChaitinPandaWikiProApiAuthV1AuthGroupListItem;
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  userList: GithubComChaitinPandaWikiProApiAuthV1AuthItem[];
  type: 'add' | 'edit';
}

const UserGroupModal = ({
  data,
  open,
  onCancel,
  userList,
  onOk,
  type,
}: UserGroupModalProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>(
    data?.auth_ids || [],
  );
  const columns: ColumnType<GithubComChaitinPandaWikiProApiAuthV1AuthItem>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      render: (text: string) => {
        return (
          <Stack direction={'row'} alignItems={'center'} gap={1}>
            {text}
          </Stack>
        );
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (text: string, record) => {
        return (
          <Box sx={{ color: 'text.secondary' }}>
            {dayjs(text).fromNow()}加入，
            {dayjs(record.last_login_time).fromNow()}活跃
          </Box>
        );
      },
    },
  ];

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
    },
  });
  const onSubmit = handleSubmit(values => {
    if (type === 'edit' && data) {
      patchApiProV1AuthGroupUpdate({
        name: values.name,
        auth_ids: selectedRowKeys,
        kb_id,
        id: data.id!,
      }).then(res => {
        message.success('编辑成功');
        onOk();
      });
    } else if (type === 'add') {
      postApiProV1AuthGroupCreate({
        name: values.name,
        ids: selectedRowKeys,
        kb_id,
        parent_id:
          (data?.id as 'root' | number) === 'root' ? undefined : data?.id,
      }).then(res => {
        message.success('添加成功');
        onOk();
      });
    }
  });

  useEffect(() => {
    if (type === 'edit' && data) {
      setSelectedRowKeys(data?.auth_ids || []);
      setValue('name', data?.name || '');
    }
  }, [data, type]);

  useEffect(() => {
    if (!open) {
      reset();
      setSelectedRowKeys([]);
    }
  }, [open]);

  return (
    <Modal
      title={type === 'add' ? '添加用户组' : '编辑用户组'}
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      width={660}
    >
      <FormItem label='用户组名称' vertical required>
        <Controller
          control={control}
          name='name'
          rules={{ required: '请输入用户组名称' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              placeholder='请输入用户组名称'
              helperText={errors.name?.message}
              error={!!errors.name}
            />
          )}
        />
      </FormItem>
      <Table
        columns={columns}
        dataSource={userList}
        rowKey='id'
        size='small'
        updateScrollTop={false}
        sx={{
          mt: 2,
          '.MuiTableContainer-root': {
            maxHeight: 'calc(100vh - 370px)',
            minHeight: 200,
          },
          '& .MuiTableCell-root': {
            height: 40,
            '&:first-of-type': {
              pl: 2,
            },
          },
        }}
        pagination={false}
        rowSelection={{
          hideSelectAll: true,
          selectedRowKeys: selectedRowKeys,
          // @ts-expect-error 类型错误
          onChange: (selectedRowKeys: number[]) => {
            setSelectedRowKeys(selectedRowKeys);
          },
        }}
        renderEmpty={
          <Stack alignItems={'center'}>
            <img src={NoData} width={150} />
            <Box
              sx={{
                fontSize: 12,
                lineHeight: '20px',
                color: 'text.tertiary',
              }}
            >
              暂无数据
            </Box>
          </Stack>
        }
      />
    </Modal>
  );
};

export default UserGroupModal;
