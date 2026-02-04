/**
 * 临时邮箱 API 封装
 * 适配 Cloudflare Worker MailFly API
 */

const MAIL_BASE_URL = 'https://apimail.ynxx.buzz';
const DEFAULT_DOMAIN = 'ynxx.buzz';
const ADMIN_PASSWORD = 'xingxin';

/**
 * 生成随机前缀
 * @param {number} length - 前缀长度
 * @returns {string} 随机前缀
 */
function generateRandomPrefix(length = 8) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let prefix = '';
  // 确保首字符是字母
  prefix += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 1; i < length; i++) {
    prefix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix;
}

/**
 * 从邮件内容提取验证码
 * @param {string} content - 邮件原始内容
 * @returns {string|null} 验证码
 */
function extractVerificationCode(content) {
  if (!content) return null;

  const patterns = [
    /Verification code:?\s*(\d{6})/i,
    /code is\s*(\d{6})/i,
    /代码为[:：]?\s*(\d{6})/,
    /验证码[:：]?\s*(\d{6})/,
    />\s*(\d{6})\s*</,
    /(?<![#&])\b(\d{6})\b/
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches && matches[1]) {
      const code = matches[1];
      // 排除已知误报
      if (code === '177010') continue;
      return code;
    }
  }
  return null;
}

/**
 * 临时邮箱客户端
 */
class MailClient {
  /**
   * @param {Object} options - 配置选项
   * @param {string} [options.baseUrl] - API 基础 URL
   * @param {string} [options.domain] - 邮箱域名
   * @param {string} [options.adminPassword] - 管理密码
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || MAIL_BASE_URL;
    this.domain = options.domain || DEFAULT_DOMAIN;
    this.adminPassword = options.adminPassword || ADMIN_PASSWORD;
    this.address = null;
    this.jwt = null;
  }

  /**
   * 创建新邮箱
   * @param {Object} options - 创建选项
   * @param {string} [options.prefix] - 自定义前缀（不提供则随机生成）
   * @param {string} [options.domain] - 自定义域名（覆盖构造函数中的域名）
   * @returns {Promise<string>} 邮箱地址
   */
  async createInbox(options = {}) {
    const name = options.prefix || generateRandomPrefix(10);
    const domain = options.domain || this.domain;

    const response = await fetch(`${this.baseUrl}/admin/new_address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-auth': this.adminPassword
      },
      body: JSON.stringify({
        enablePrefix: true,
        name: name,
        domain: domain
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`创建邮箱失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    this.address = data.address;
    this.jwt = data.jwt;

    console.log(`[Mail API] 邮箱创建成功: ${this.address}`);
    return this.address;
  }

  /**
   * 获取邮箱邮件列表
   * @returns {Promise<Array>} 邮件列表
   */
  async getMailList() {
    if (!this.address || !this.jwt) {
      throw new Error('邮箱未创建');
    }

    const url = new URL(`${this.baseUrl}/api/mails`);
    url.searchParams.set('limit', '10');
    url.searchParams.set('offset', '0');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.jwt}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`获取邮件列表失败: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * 轮询等待验证码邮件
   * @param {number} timeout - 超时时间（毫秒），默认120000
   * @param {number} pollInterval - 轮询间隔（毫秒），默认3000
   * @returns {Promise<string>} 验证码字符串
   */
  async waitForVerificationCode(timeout = 120000, pollInterval = 3000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const mailList = await this.getMailList();
        console.log('[Mail API] 邮件列表:', mailList.length, '封');

        if (mailList && mailList.length > 0) {
          for (const mail of mailList) {
            // 检查发件人是否来自 AWS/Amazon
            const sender = (mail.source || mail.from || '').toLowerCase();
            if (sender.includes('amazon') || sender.includes('aws')) {
              const rawContent = mail.raw || mail.text || mail.html || '';
              const code = extractVerificationCode(rawContent);
              if (code) {
                console.log(`[Mail API] 提取到验证码: ${code}`);
                return code;
              }
            }
          }

          // 如果没有匹配发件人，尝试从所有邮件提取
          for (const mail of mailList) {
            const rawContent = mail.raw || mail.text || mail.html || '';
            const code = extractVerificationCode(rawContent);
            if (code) {
              console.log(`[Mail API] 提取到验证码: ${code}`);
              return code;
            }
          }
        }
      } catch (e) {
        console.error('[Mail API] 轮询出错:', e);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`等待验证码超时（${timeout / 1000}s）`);
  }

  /**
   * 删除邮箱（当前 API 不支持，保留接口）
   */
  async deleteInbox() {
    // 当前 MailFly API 不支持删除，邮箱会自动过期
    console.log('[Mail API] 邮箱将自动过期');
  }

  /**
   * 获取当前邮箱信息
   * @returns {{address: string, jwt: string}}
   */
  getInfo() {
    return {
      address: this.address,
      accessKey: this.jwt // 兼容旧接口
    };
  }
}

export { MailClient, MAIL_BASE_URL, DEFAULT_DOMAIN, ADMIN_PASSWORD, generateRandomPrefix, extractVerificationCode };
