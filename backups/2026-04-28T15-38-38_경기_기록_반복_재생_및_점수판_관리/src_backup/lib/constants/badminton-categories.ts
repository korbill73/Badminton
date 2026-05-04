export const REASONS_INITIAL = {
    WIN: [
        { id: 'offensive', label: '주도적 공격' },
        { id: 'tactical', label: '전술 유도 및 행운' }
    ],
    LOSS: [
        { id: 'error', label: '나의 단순 범실' },
        { id: 'induced_error', label: '압박에 의한 범실' },
        { id: 'offensive_success', label: '상대 공격 성공' }
    ]
};

export const WIN_GROUPS_INITIAL = {
    'smash': { label: '스매시', reasonId: 'offensive', subs: ['직선 스매시', '대각 스매시', '빈스매시'] },
    'drop': { label: '드롭', reasonId: 'offensive', subs: ['직선', '대각(리버스)'] },
    'net_play': { label: '네트 플레이', reasonId: 'offensive', subs: ['헤어핀', '크로스 헤어핀', '푸시', '네트 킬'] },
    'other_atk': { label: '기타 공격', reasonId: 'offensive', subs: ['드라이브', '클리어 공격', '서비스', '행운의 득점'] },
    'opp_error': { label: '상대 에러', reasonId: 'tactical', subs: ['언더 에러', '스매시 에러', '서브 에러', '클리어 에러', '기본기 에러', '백핸드 에러'] }
};

export const LOSS_GROUPS_INITIAL = {
    'opp_offensive': { label: '상대 공격 득점', reasonId: 'offensive_success', subs: ['스매시', '대각 스매시', '드라이브', '롱 드라이브', '드롭', '헤어핀+푸시'] },
    'my_error': { label: '나의 에러', reasonId: 'error', subs: ['스매시 에러', '드롭 에러', '언더 에러', '헤어핀 에러', '클리어 에러', '기본기 에러'] },
    'induced_mistake': { label: '전술 당함', reasonId: 'induced_error', subs: ['페인트 모션', '코스 속임수', '템포 변화'] }
};
