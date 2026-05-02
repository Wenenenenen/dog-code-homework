// 展会区域数据
export const mockAreas = [
  {
    id: 'area-1',
    name: 'A区 - 科技展区',
    description: '展示最新科技产品和创新技术',
    color: '#e3f2fd'
  },
  {
    id: 'area-2',
    name: 'B区 - 消费品展区',
    description: '展示各类消费产品和生活方式产品',
    color: '#fff3e0'
  },
  {
    id: 'area-3',
    name: 'C区 - 服务展区',
    description: '展示各类专业服务和解决方案',
    color: '#f3e5f5'
  }
];

// 摊位数据
export const mockBooths = [
  // A区摊位
  { id: 'booth-1', number: 'A01', areaId: 'area-1', size: '12m²', description: '主入口位置' },
  { id: 'booth-2', number: 'A02', areaId: 'area-1', size: '12m²', description: '靠近主通道' },
  { id: 'booth-3', number: 'A03', areaId: 'area-1', size: '9m²', description: '标准摊位' },
  { id: 'booth-4', number: 'A04', areaId: 'area-1', size: '9m²', description: '标准摊位' },
  { id: 'booth-5', number: 'A05', areaId: 'area-1', size: '24m²', description: '特装摊位' },
  
  // B区摊位
  { id: 'booth-6', number: 'B01', areaId: 'area-2', size: '12m²', description: '主入口位置' },
  { id: 'booth-7', number: 'B02', areaId: 'area-2', size: '12m²', description: '靠近主通道' },
  { id: 'booth-8', number: 'B03', areaId: 'area-2', size: '9m²', description: '标准摊位' },
  { id: 'booth-9', number: 'B04', areaId: 'area-2', size: '9m²', description: '标准摊位' },
  { id: 'booth-10', number: 'B05', areaId: 'area-2', size: '24m²', description: '特装摊位' },
  
  // C区摊位
  { id: 'booth-11', number: 'C01', areaId: 'area-3', size: '12m²', description: '主入口位置' },
  { id: 'booth-12', number: 'C02', areaId: 'area-3', size: '12m²', description: '靠近主通道' },
  { id: 'booth-13', number: 'C03', areaId: 'area-3', size: '9m²', description: '标准摊位' },
  { id: 'booth-14', number: 'C04', areaId: 'area-3', size: '9m²', description: '标准摊位' },
  { id: 'booth-15', number: 'C05', areaId: 'area-3', size: '24m²', description: '特装摊位' }
];

// 参展商数据
export const mockExhibitors = [
  {
    id: 'exhibitor-1',
    name: '未来科技有限公司',
    contact: '张经理',
    phone: '13800138001',
    industry: '人工智能',
    description: '专注于AI技术研发和应用'
  },
  {
    id: 'exhibitor-2',
    name: '创新电子科技',
    contact: '李总监',
    phone: '13800138002',
    industry: '电子科技',
    description: '智能硬件和物联网解决方案'
  },
  {
    id: 'exhibitor-3',
    name: '绿色生活集团',
    contact: '王经理',
    phone: '13800138003',
    industry: '环保产品',
    description: '环保家居和绿色生活产品'
  },
  {
    id: 'exhibitor-4',
    name: '时尚家居有限公司',
    contact: '陈小姐',
    phone: '13800138004',
    industry: '家居用品',
    description: '现代家居设计和产品'
  },
  {
    id: 'exhibitor-5',
    name: '智慧金融服务',
    contact: '刘先生',
    phone: '13800138005',
    industry: '金融服务',
    description: '金融科技和智能投顾'
  },
  {
    id: 'exhibitor-6',
    name: '健康医疗科技',
    contact: '赵医生',
    phone: '13800138006',
    industry: '医疗健康',
    description: '医疗设备和健康管理'
  },
  {
    id: 'exhibitor-7',
    name: '教育科技集团',
    contact: '孙老师',
    phone: '13800138007',
    industry: '教育培训',
    description: '在线教育和智能学习'
  },
  {
    id: 'exhibitor-8',
    name: '云端数据服务',
    contact: '周工程师',
    phone: '13800138008',
    industry: '云计算',
    description: '云服务和大数据解决方案'
  }
];

// 时间段数据
export const mockTimeSlots = [
  {
    id: 'slot-1',
    name: '第一天 - 上午',
    date: '2026-06-15',
    startTime: '09:00',
    endTime: '12:00',
    order: 1
  },
  {
    id: 'slot-2',
    name: '第一天 - 下午',
    date: '2026-06-15',
    startTime: '13:00',
    endTime: '17:00',
    order: 2
  },
  {
    id: 'slot-3',
    name: '第二天 - 上午',
    date: '2026-06-16',
    startTime: '09:00',
    endTime: '12:00',
    order: 3
  },
  {
    id: 'slot-4',
    name: '第二天 - 下午',
    date: '2026-06-16',
    startTime: '13:00',
    endTime: '17:00',
    order: 4
  },
  {
    id: 'slot-5',
    name: '第三天 - 上午',
    date: '2026-06-17',
    startTime: '09:00',
    endTime: '12:00',
    order: 5
  },
  {
    id: 'slot-6',
    name: '第三天 - 下午',
    date: '2026-06-17',
    startTime: '13:00',
    endTime: '17:00',
    order: 6
  }
];

// 初始排期记录（包含一些冲突用于演示）
export const mockSchedules = [
  {
    id: 'schedule-1',
    boothId: 'booth-1',
    exhibitorId: 'exhibitor-1',
    timeSlotId: 'slot-1',
    notes: '开幕展示',
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  },
  {
    id: 'schedule-2',
    boothId: 'booth-1',
    exhibitorId: 'exhibitor-2',
    timeSlotId: 'slot-1',
    notes: '冲突演示 - 同一摊位同一时间',
    createdAt: '2026-05-01T10:05:00Z',
    updatedAt: '2026-05-01T10:05:00Z'
  },
  {
    id: 'schedule-3',
    boothId: 'booth-2',
    exhibitorId: 'exhibitor-1',
    timeSlotId: 'slot-1',
    notes: '冲突演示 - 同一参展商同一时间',
    createdAt: '2026-05-01T10:10:00Z',
    updatedAt: '2026-05-01T10:10:00Z'
  },
  {
    id: 'schedule-4',
    boothId: 'booth-3',
    exhibitorId: 'exhibitor-3',
    timeSlotId: 'slot-1',
    notes: '',
    createdAt: '2026-05-01T10:15:00Z',
    updatedAt: '2026-05-01T10:15:00Z'
  },
  {
    id: 'schedule-5',
    boothId: 'booth-4',
    exhibitorId: 'exhibitor-4',
    timeSlotId: 'slot-2',
    notes: '',
    createdAt: '2026-05-01T10:20:00Z',
    updatedAt: '2026-05-01T10:20:00Z'
  }
];

// 获取默认数据
export function getDefaultData() {
  return {
    areas: mockAreas,
    booths: mockBooths,
    exhibitors: mockExhibitors,
    timeSlots: mockTimeSlots,
    schedules: mockSchedules
  };
}
