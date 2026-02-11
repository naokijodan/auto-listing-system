'use client';

import { useState } from 'react';
import {
  useCustomerSupportStats,
  usePendingMessages,
  useAutoReplyRules,
  useMessageTemplates,
  PendingMessage,
  AutoReplyRule,
} from '@/lib/hooks';
import { postApi, patchApi } from '@/lib/api';

export default function CustomerSupportPage() {
  const [selectedTab, setSelectedTab] = useState<'messages' | 'rules' | 'templates'>('messages');
  const [selectedMessage, setSelectedMessage] = useState<PendingMessage | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: statsData, isLoading: statsLoading } = useCustomerSupportStats();
  const { data: messagesData, isLoading: messagesLoading, mutate: mutateMessages } = usePendingMessages(50);
  const { data: rulesData, isLoading: rulesLoading, mutate: mutateRules } = useAutoReplyRules();
  const { data: templatesData, isLoading: templatesLoading } = useMessageTemplates();

  const stats = statsData?.data;
  const messages = messagesData?.data || [];
  const rules = rulesData?.data || [];
  const templates = templatesData?.data || [];

  const handleAnalyzeMessage = async (message: PendingMessage) => {
    try {
      const result = await postApi<{
        success: boolean;
        data: {
          sentiment: string;
          urgency: string;
          category: string;
          suggestedAction: string;
          matchedRules: AutoReplyRule[];
        };
      }>('/api/customer-support/analyze', {
        message: message.body,
        marketplace: message.marketplace,
        isFirstMessage: false,
        orderId: message.orderId,
      });

      alert(
        `分析結果:\n` +
          `センチメント: ${result.data.sentiment}\n` +
          `緊急度: ${result.data.urgency}\n` +
          `カテゴリ: ${result.data.category}\n` +
          `推奨アクション: ${result.data.suggestedAction}`
      );
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('分析に失敗しました');
    }
  };

  const handleGenerateReply = async (message: PendingMessage, ruleId: string) => {
    try {
      const result = await postApi<{
        success: boolean;
        data: { subject: string; body: string };
      }>('/api/customer-support/generate-reply', {
        ruleId,
        orderId: message.orderId,
      });

      setReplyText(result.data.body);
    } catch (error) {
      console.error('Generate reply failed:', error);
      alert('返信生成に失敗しました');
    }
  };

  const handleToggleRule = async (rule: AutoReplyRule) => {
    try {
      await patchApi(`/api/customer-support/rules/${rule.id}`, {
        isActive: !rule.isActive,
      });
      mutateRules();
    } catch (error) {
      console.error('Toggle rule failed:', error);
    }
  };

  const handleInitDefaults = async () => {
    try {
      const result = await postApi<{
        success: boolean;
        data: { templatesCreated: number; rulesCreated: number };
      }>('/api/customer-support/init-defaults', {});

      alert(
        `初期化完了:\nテンプレート: ${result.data.templatesCreated}件\nルール: ${result.data.rulesCreated}件`
      );
      mutateRules();
    } catch (error) {
      console.error('Init defaults failed:', error);
      alert('初期化に失敗しました');
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'text-green-600';
      case 'NEGATIVE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">顧客対応管理</h1>
          <p className="text-gray-600 mt-1">自動返信、メッセージ分析、テンプレート管理</p>
        </div>
        <button
          onClick={handleInitDefaults}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          デフォルト初期化
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">未返信メッセージ</div>
          <div className="text-2xl font-bold text-orange-600">
            {statsLoading ? '-' : stats?.pendingMessages || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">平均返信時間</div>
          <div className="text-2xl font-bold text-blue-600">
            {statsLoading ? '-' : `${stats?.avgResponseTime || 0}分`}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">自動返信数(30日)</div>
          <div className="text-2xl font-bold text-green-600">
            {statsLoading ? '-' : stats?.autoReplySent || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">総メッセージ(30日)</div>
          <div className="text-2xl font-bold text-gray-900">
            {statsLoading ? '-' : stats?.totalMessages || 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'messages', label: '未返信メッセージ' },
            { id: 'rules', label: '自動返信ルール' },
            { id: 'templates', label: 'テンプレート' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">未返信メッセージ</h2>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {messagesLoading ? (
                <div className="p-4 text-center text-gray-500">読み込み中...</div>
              ) : messages.length === 0 ? (
                <div className="p-4 text-center text-gray-500">未返信メッセージはありません</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{msg.buyerUsername}</span>
                      <div className="flex gap-2">
                        {msg.urgency && (
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getUrgencyColor(msg.urgency)}`}
                          >
                            {msg.urgency}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{msg.marketplace}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{msg.subject || msg.body}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-xs ${getSentimentColor(msg.sentiment)}`}>
                        {msg.category || 'GENERAL'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Detail & Reply */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">メッセージ詳細</h2>
            </div>
            {selectedMessage ? (
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{selectedMessage.buyerUsername}</span>
                    <span className="text-sm text-gray-500">{selectedMessage.marketplace}</span>
                  </div>
                  {selectedMessage.order && (
                    <div className="text-sm text-gray-600 mb-2">
                      注文: {selectedMessage.order.marketplaceOrderId} (${selectedMessage.order.total})
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="font-medium mb-1">{selectedMessage.subject}</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedMessage.body}</p>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleAnalyzeMessage(selectedMessage)}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      AI分析
                    </button>
                    {rules
                      .filter((r) => r.isActive)
                      .slice(0, 3)
                      .map((rule) => (
                        <button
                          key={rule.id}
                          onClick={() => handleGenerateReply(selectedMessage, rule.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          {rule.name.slice(0, 10)}...
                        </button>
                      ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">返信内容</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full border rounded-lg p-3 h-40"
                    placeholder="返信を入力..."
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                      下書き保存
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      送信
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                メッセージを選択してください
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'rules' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">自動返信ルール</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              ルール追加
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ルール名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    トリガー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    条件
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    テンプレート
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    優先度
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    使用回数
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    状態
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rulesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      ルールがありません。「デフォルト初期化」をクリックしてください。
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{rule.name}</div>
                        {rule.description && (
                          <div className="text-xs text-gray-500">{rule.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {rule.triggerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {rule.triggerCondition.keywords && (
                          <div className="text-xs text-gray-600">
                            キーワード: {rule.triggerCondition.keywords.slice(0, 3).join(', ')}
                            {rule.triggerCondition.keywords.length > 3 && '...'}
                          </div>
                        )}
                        {rule.triggerCondition.delayMinutes && (
                          <div className="text-xs text-gray-600">
                            遅延: {rule.triggerCondition.delayMinutes}分
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {rule.template?.name || rule.templateId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">{rule.priority}</td>
                      <td className="px-4 py-3 text-center text-sm">{rule.usageCount}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`px-3 py-1 text-xs rounded-full ${
                            rule.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rule.isActive ? '有効' : '無効'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'templates' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">メッセージテンプレート</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              テンプレート追加
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {templatesLoading ? (
              <div className="col-span-2 text-center text-gray-500 py-8">読み込み中...</div>
            ) : templates.length === 0 ? (
              <div className="col-span-2 text-center text-gray-500 py-8">
                テンプレートがありません。「デフォルト初期化」をクリックしてください。
              </div>
            ) : (
              templates.map((tmpl) => (
                <div key={tmpl.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{tmpl.name}</h3>
                      {tmpl.nameEn && (
                        <p className="text-sm text-gray-500">{tmpl.nameEn}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        tmpl.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tmpl.category || 'GENERAL'}
                    </span>
                  </div>
                  {tmpl.subject && (
                    <p className="text-sm font-medium text-gray-700 mb-1">件名: {tmpl.subject}</p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-3">{tmpl.body}</p>
                  {tmpl.variables && tmpl.variables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tmpl.variables.map((v) => (
                        <span key={v} className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                      編集
                    </button>
                    <button className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                      プレビュー
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Category/Sentiment Distribution */}
      {stats && (stats.byCategory || stats.bySentiment) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">カテゴリ別分布</h3>
              <div className="space-y-2">
                {Object.entries(stats.byCategory).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.bySentiment && Object.keys(stats.bySentiment).length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">センチメント分布</h3>
              <div className="space-y-2">
                {Object.entries(stats.bySentiment).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex justify-between items-center">
                    <span className={`text-sm ${getSentimentColor(sentiment)}`}>{sentiment}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
