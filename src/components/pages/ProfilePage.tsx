'use client';

import { useEffect, useState } from 'react';
import { BookOpen, LogOut, User, Gift } from 'lucide-react';
import { useAppStore } from '@/store';
import { bindInviteCode, confirmPaymentOrder, createPaymentOrder, fetchAnalysisHistory, fetchCurrentUser, fetchInviteProfile, fetchPaymentOrders, loginWithAccount, sendLoginCode, type AnalysisHistoryItem, type InviteProfile, type LoginAccountType, type PaymentOrder } from '@/lib/api';
import { t, tf } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';

export default function ProfilePage() {
  const { user, token, setToken, setUser, logout } = useAppStore();
  const [accountType, setAccountType] = useState<LoginAccountType>('phone');
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState<InviteProfile | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [sendCodeLoading, setSendCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [invite, me, paymentOrders, history] = await Promise.all([
          fetchInviteProfile(token),
          fetchCurrentUser(token),
          fetchPaymentOrders(token),
          fetchAnalysisHistory(token, 100, 0),
        ]);
        setProfile(invite);
        setUser(me);
        setOrders(paymentOrders);
        setAnalysisHistory(history);
      } catch {
        setProfile(null);
        setOrders([]);
        setAnalysisHistory([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token, setUser]);

  const handleLogin = async () => {
    if (!account.trim()) {
      setNotice(accountType === 'phone' ? t('profile.phoneRequired') : '请输入邮箱');
      return;
    }
    if (!code.trim()) {
      setNotice('请输入验证码');
      return;
    }
    try {
      const data = await loginWithAccount(account.trim(), code.trim(), accountType, nickname.trim() || undefined);
      setToken(data.token);
      setUser(data.user);
      setNotice(t('profile.loginSuccess'));
      trackEvent('auth_login_success');
      const [invite, paymentOrders, history] = await Promise.all([
        fetchInviteProfile(data.token),
        fetchPaymentOrders(data.token),
        fetchAnalysisHistory(data.token, 100, 0),
      ]);
      setProfile(invite);
      setOrders(paymentOrders);
      setAnalysisHistory(history);
    } catch {
      setNotice(t('profile.loginFailed'));
      trackEvent('auth_login_failed');
    }
  };

  const handleSendCode = async () => {
    if (!account.trim()) {
      setNotice(accountType === 'phone' ? t('profile.phoneRequired') : '请输入邮箱');
      return;
    }
    try {
      setSendCodeLoading(true);
      await sendLoginCode(account.trim());
      setCountdown(60);
      setNotice('验证码已发送（联调环境验证码固定为 000000）');
    } catch {
      setNotice('验证码发送失败，请稍后重试');
    } finally {
      setSendCodeLoading(false);
    }
  };

  const handleBindInvite = async () => {
    if (!token) {
      setNotice(t('profile.loginRequired'));
      return;
    }
    try {
      await bindInviteCode(inviteInput.trim().toUpperCase(), token);
      setInviteInput('');
      setNotice(t('profile.inviteBindSuccess'));
      trackEvent('invite_bind_success');
      const invite = await fetchInviteProfile(token);
      setProfile(invite);
    } catch {
      setNotice(t('profile.inviteBindFailed'));
      trackEvent('invite_bind_failed');
    }
  };

  const handleLogout = () => {
    logout();
    setNotice(t('profile.logoutSuccess'));
    trackEvent('auth_logout');
    setProfile(null);
    setOrders([]);
    setAnalysisHistory([]);
  };

  const refreshAuthedData = async (authToken: string) => {
    const [invite, me, paymentOrders, history] = await Promise.all([
      fetchInviteProfile(authToken),
      fetchCurrentUser(authToken),
      fetchPaymentOrders(authToken),
      fetchAnalysisHistory(authToken, 100, 0),
    ]);
    setProfile(invite);
    setUser(me);
    setOrders(paymentOrders);
    setAnalysisHistory(history);
  };

  const handleRenew = async (plan: 'vip' | 'pro') => {
    if (!token) {
      setNotice(t('profile.loginRequired'));
      return;
    }
    setRenewLoading(true);
    try {
      const order = await createPaymentOrder(plan, token);
      await confirmPaymentOrder(order.order_no, token);
      await refreshAuthedData(token);
      setNotice(tf('profile.renewSuccess', { plan: plan.toUpperCase() }));
      trackEvent('payment_renew_success', { plan });
    } catch {
      setNotice(t('profile.renewFailed'));
      trackEvent('payment_renew_failed', { plan });
    } finally {
      setRenewLoading(false);
    }
  };

  const totalAnalyses = analysisHistory.length;
  const avgScore = totalAnalyses > 0
    ? analysisHistory.reduce((sum, item) => sum + item.bull_eye_score, 0) / totalAnalyses
    : 0;
  const sevenDayTrend = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const key = d.toISOString().slice(0, 10);
    const count = analysisHistory.filter((item) => (item.analysis_date ?? '').slice(0, 10) === key).length;
    return { key, count };
  });
  const maxDaily = Math.max(1, ...sevenDayTrend.map((item) => item.count));
  const vipExpireDate = user?.vip_expire_at ? new Date(user.vip_expire_at) : null;
  const now = new Date();
  const expireDaysLeft = vipExpireDate
    ? Math.ceil((vipExpireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-4 page-enter">
      <div>
        <h1 className="text-lg font-bold text-dark-100">个人中心</h1>
        <p className="text-xs text-dark-400 mt-0.5">账号、会员与常用入口</p>
      </div>

      {!token ? (
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-orange-400" />
            <span className="font-semibold text-sm">注册 / 登录</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`btn-ghost text-sm py-2 ${accountType === 'phone' ? 'border border-yellow-400/30' : ''}`}
              onClick={() => setAccountType('phone')}
            >
              手机号登录
            </button>
            <button
              className={`btn-ghost text-sm py-2 ${accountType === 'email' ? 'border border-yellow-400/30' : ''}`}
              onClick={() => setAccountType('email')}
            >
              邮箱登录
            </button>
          </div>
          <input
            className="input-dark"
            placeholder={accountType === 'phone' ? '手机号' : '邮箱'}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="input-dark flex-1"
              placeholder="验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              className="btn-ghost text-sm px-3"
              onClick={() => void handleSendCode()}
              disabled={sendCodeLoading || countdown > 0}
            >
              {countdown > 0 ? `${countdown}s` : '发送验证码'}
            </button>
          </div>
          <input
            className="input-dark"
            placeholder="昵称（注册可选）"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <button className="btn-primary w-full" onClick={() => void handleLogin()}>
            登录 / 注册
          </button>
        </div>
      ) : (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-dark-100">{user?.nickname || '用户'}</div>
              <div className="text-xs text-dark-400">{user?.phone}</div>
            </div>
            <div className="text-xs text-dark-300">
              当前等级：{user?.vip_level === 2 ? 'PRO' : user?.vip_level === 1 ? 'VIP' : '免费版'}
            </div>
          </div>
          <button className="btn-ghost w-full text-sm py-2" onClick={() => void handleLogout()}>
            <LogOut size={14} className="mr-1" />
            退出登录
          </button>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="card card-sm">
              <div className="text-dark-400">今日配额</div>
              <div className="font-bold text-dark-100">{user?.daily_quota ?? 0}</div>
            </div>
            <div className="card card-sm">
              <div className="text-dark-400">已使用</div>
              <div className="font-bold text-orange-300">{user?.daily_used ?? 0}</div>
            </div>
            <div className="card card-sm">
              <div className="text-dark-400">剩余</div>
              <div className={`font-bold ${Math.max(0, (user?.daily_quota ?? 0) - (user?.daily_used ?? 0)) > 0 ? 'text-bull' : 'text-bear'}`}>
                {Math.max(0, (user?.daily_quota ?? 0) - (user?.daily_used ?? 0))}
              </div>
            </div>
          </div>
          {user?.vip_expire_at && (
            <div className="text-xs text-dark-400">
              会员到期时间：<span className="text-dark-100">{new Date(user.vip_expire_at).toLocaleString('zh-CN')}</span>
            </div>
          )}
        </div>
      )}

      <div className="card space-y-3">
        <div className="font-semibold text-sm text-dark-100">会员权益</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="card card-sm">
            <div className="text-dark-400">免费版</div>
            <div className="text-dark-200 mt-1">每日3次分析</div>
          </div>
          <div className="card card-sm">
            <div className="text-orange-300">VIP</div>
            <div className="text-dark-200 mt-1">专属报告+优先体验</div>
          </div>
          <div className="card card-sm">
            <div className="text-yellow-300">PRO</div>
            <div className="text-dark-200 mt-1">全工具+回测+批量分析</div>
          </div>
        </div>
        {user?.vip_level && user.vip_level > 0 && expireDaysLeft !== null && (
          <div className={`text-xs p-2 rounded-lg ${expireDaysLeft <= 7 ? 'text-bear bg-bear/10' : 'text-dark-300 bg-white/5'}`}>
            {expireDaysLeft <= 0
              ? '会员已到期，请尽快续费以避免功能中断。'
              : expireDaysLeft <= 7
              ? `会员将在 ${expireDaysLeft} 天后到期，建议提前续费。`
              : `会员状态正常，距离到期还有 ${expireDaysLeft} 天。`}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-ghost text-sm py-2"
            onClick={() => void handleRenew('vip')}
            disabled={renewLoading}
          >
            续费VIP ¥39/月
          </button>
          <button
            className="btn-primary text-sm py-2"
            onClick={() => void handleRenew('pro')}
            disabled={renewLoading}
          >
            续费PRO ¥99/月
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-orange-400" />
          <span className="font-semibold text-sm">邀请中心</span>
        </div>
        <div className="text-xs text-dark-400">
          我的邀请码：<span className="text-dark-100 font-semibold">{profile?.my_code ?? '请登录查看'}</span>
        </div>
        <div className="text-xs text-dark-400">累计邀请：{profile?.invited_count ?? 0} 人</div>
        <div className="flex gap-2">
          <input
            className="input-dark text-sm flex-1"
            placeholder="输入邀请码"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
          />
          <button
            className="btn-primary text-sm px-4"
            onClick={() => void handleBindInvite()}
            disabled={!!profile?.has_bound_inviter}
          >
            {profile?.has_bound_inviter ? '已绑定' : '绑定'}
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-dark-100">分析记录总览</span>
          <span className="text-xs text-dark-500">{totalAnalyses} 条</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="card card-sm">
            <div className="text-dark-400">累计分析</div>
            <div className="font-bold text-dark-100">{totalAnalyses}</div>
          </div>
          <div className="card card-sm">
            <div className="text-dark-400">平均评分</div>
            <div className="font-bold text-orange-300">{avgScore.toFixed(1)}</div>
          </div>
          <div className="card card-sm">
            <div className="text-dark-400">近7天活跃</div>
            <div className="font-bold text-bull">
              {sevenDayTrend.reduce((sum, item) => sum + item.count, 0)}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-dark-400">近7天分析趋势</div>
          <div className="grid grid-cols-7 gap-1 items-end h-16">
            {sevenDayTrend.map((item) => (
              <div key={item.key} className="flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-sm bg-yellow-400/70"
                  style={{ height: `${(item.count / maxDaily) * 42 + 2}px` }}
                  title={`${item.key}: ${item.count}`}
                />
                <div className="text-[10px] text-dark-500">{item.key.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-dark-100">订单与开通记录</span>
          <span className="text-xs text-dark-500">{loading ? '刷新中...' : `${orders.length} 条`}</span>
        </div>
        {orders.length === 0 ? (
          <div className="text-xs text-dark-500">暂无订单记录</div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 8).map((o) => (
              <div key={o.order_no} className="p-2 rounded-lg bg-white/5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-dark-200 font-medium">{o.plan.toUpperCase()} · ¥{o.amount}</span>
                  <span className={`font-semibold ${o.status === 'paid' ? 'text-bull' : o.status === 'failed' ? 'text-bear' : 'text-orange-300'}`}>
                    {o.status}
                  </span>
                </div>
                <div className="text-dark-500 mt-1">
                  订单号: {o.order_no} · 创建: {o.created_at ? new Date(o.created_at).toLocaleString('zh-CN') : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-orange-400" />
          <span className="font-semibold text-sm">投资教程</span>
        </div>
        {[
          '什么是K线？一文读懂蜡烛图',
          'MACD指标使用指南',
          '主力资金如何影响股价？',
          '筹码分布原理详解',
        ].map((title, idx) => (
          <div key={idx} className="text-sm text-dark-300 p-2 rounded-lg bg-white/5">
            {title}
          </div>
        ))}
      </div>

      {notice && <div className="card text-xs text-dark-300">{notice}</div>}
    </div>
  );
}
