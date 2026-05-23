import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  UploadCloud, ShieldAlert, ShieldCheck, FileText, Link as LinkIcon, 
  Server, Search, AlertTriangle, CheckCircle, Info, Mail, Target, 
  ExternalLink, Clock, Menu, X, Trash2, Code, Download, FileJson,
  Crosshair, Database, Activity, Zap
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const DEMO_EML = `Delivered-To: victim@company.com
Received: by 10.220.100.150 with SMTP id t14csp123456;
        Thu, 21 May 2026 08:30:12 -0700 (PDT)
X-Google-Smtp-Source: ABdhPJxyz1234567890
X-Received: by 2002:a05:6000:1234:: with SMTP id abcd123456789;
        Thu, 21 May 2026 08:30:12 -0700 (PDT)
Authentication-Results: mx.google.com;
       dkim=fail header.i=@billing-paypal-secure.com header.s=key1 header.b=xyz;
       spf=fail (google.com: domain of admin@billing-paypal-secure.com does not designate 198.51.100.42 as permitted sender) smtp.mailfrom=admin@billing-paypal-secure.com;
       dmarc=fail (p=NONE sp=NONE dis=NONE) header.from=billing-paypal-secure.com
Return-Path: <bounce-hacker@attacker-infra.net>
Received: from mail.billing-paypal-secure.com (mail.billing-paypal-secure.com. [198.51.100.42])
        by mx.google.com with ESMTPS id xyz123
        for <victim@company.com>;
        Thu, 21 May 2026 08:30:11 -0700 (PDT)
From: "PayPal Security" <admin@billing-paypal-secure.com>
To: "User" <victim@company.com>
Subject: URGENT: Your Account Has Been Suspended!
Date: Thu, 21 May 2026 15:28:00 +0000
Message-ID: <hacker123@attacker-infra.net>
X-Mailer: PHP Mailer script
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="----=_NextPart_000"

This is a multi-part message in MIME format.

------=_NextPart_000
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

<html>
<body style=3D"font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
<div style=3D"max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
<img src=3D"https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt=3D"PayPal" style=3D"height: 40px; margin-bottom: 20px;" />
<h2 style=3D"color: #d9534f; margin-top: 20px;">Account Suspended</h2>
<p style=3D"color: #333; line-height: 1.6;">Dear Customer,</p>
<p style=3D"color: #333; line-height: 1.6;">We noticed suspicious logins from a new device. To prevent unauthorized transactions, we have temporarily restricted your account. Please verify your identity immediately.</p>
<div style=3D"text-align: center; margin: 30px 0;">
<a href=3D"http://login-update-paypal-security.firebaseapp.com/login.php?token=3D123&session=3Dabc" style=3D"background: #0070ba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Account Now</a>
</div>
<p style=3D"color: #777; font-size: 12px;">If you did not authorize this, please download the attached security report and contact support.</p>
</div>
</body>
</html>

------=_NextPart_000
Content-Type: application/pdf; name="Invoice_Notice_99321.pdf"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="Invoice_Notice_99321.pdf"

JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURl
Y29kZT4+CnN0cmVhbQp4nDP... (fake base64 data)
------=_NextPart_000--
`;

// ================================================================
// EMAIL PARSER
// ================================================================
const parseEmail = (rawEml) => {
  const data = {
    basic: { to: 'Unknown', from: 'Unknown', subject: 'No Subject', date: 'Unknown', utcDate: 'Unknown', messageId: 'Unknown', replyTo: 'Unknown', cc: 'Unknown', contentType: 'Unknown', priority: 'Normal' },
    auth: { spf: 'neutral', dkim: 'neutral', dmarc: 'neutral' },
    network: { originatingIp: 'Unknown', returnPath: 'Unknown', xMailer: 'Unknown', hopCount: 0, routingPath: [] },
    payload: { urls: [], attachments: [], htmlBody: '', textBody: '', domains: [] },
    raw: rawEml,
    headers: ''
  };

  try {
    const headerSplit = rawEml.split(/\r?\n\r?\n/);
    data.headers = headerSplit[0] || 'No headers found';

    const headerBlock = rawEml.split(/\r?\n\r?\n/)[0] || rawEml;
    const unfoldedHeaders = headerBlock.replace(/\r?\n[ \t]+/g, ' ');

    const extractHeader = (regex) => {
      if (!unfoldedHeaders || typeof unfoldedHeaders !== 'string') return 'Unknown';
      const match = unfoldedHeaders.match(regex);
      if (match && match.length > 1 && typeof match[1] === 'string') {
        return match[1].trim();
      }
      return 'Unknown';
    };

    data.basic.to = extractHeader(/^To:\s*(.+)$/im);
    data.basic.from = extractHeader(/^From:\s*(.+)$/im);
    data.basic.replyTo = extractHeader(/^Reply-To:\s*(.+)$/im);
    data.basic.cc = extractHeader(/^Cc:\s*(.+)$/im);
    data.basic.subject = extractHeader(/^Subject:\s*(.+)$/im);
    data.basic.date = extractHeader(/^Date:\s*(.+)$/im);
    data.basic.messageId = extractHeader(/^Message-ID:\s*(.+)$/im);
    data.network.returnPath = extractHeader(/^Return-Path:\s*(.+)$/im);
    data.network.xMailer = extractHeader(/^X-Mailer:\s*(.+)$/im);
    
    data.basic.contentType = extractHeader(/^Content-Type:\s*([^;\r\n]+)/im);
    
    const priorityMatch = extractHeader(/^(?:X-Priority|Importance):\s*(.+)$/im);
    if (priorityMatch !== 'Unknown') data.basic.priority = priorityMatch;

    if (data.basic.date !== 'Unknown') {
      try {
        const dateObj = new Date(data.basic.date);
        if (!isNaN(dateObj)) {
          data.basic.utcDate = dateObj.toUTCString();
        }
      } catch (e) { /* ignore */ }
    }

    const receivedHeaders = [...unfoldedHeaders.matchAll(/^Received:\s*(.+)$/gim)];
    data.network.hopCount = receivedHeaders.length;
    
    data.network.routingPath = receivedHeaders.map(h => {
      const headerStr = h[0];
      const ipMatch = headerStr.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
      const fromMatch = headerStr.match(/from\s+([^\s]+)/i);
      const byMatch = headerStr.match(/by\s+([^\s]+)/i);
      
      return {
        from: fromMatch ? fromMatch[1] : 'Unknown',
        by: byMatch ? byMatch[1] : 'Unknown',
        ip: ipMatch ? ipMatch[1] : 'None'
      };
    }).reverse();

    if (receivedHeaders.length > 0) {
      for (let i = receivedHeaders.length - 1; i >= 0; i--) {
        const headerStr = receivedHeaders[i][0];
        const ipMatch = headerStr.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
        if (ipMatch && ipMatch[1]) {
          const ip = ipMatch[1];
          if (!ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')) {
             data.network.originatingIp = ip;
             break;
          }
        }
      }
    }

    const authResults = extractHeader(/^Authentication-Results:\s*(.+)$/im);
    if (authResults !== 'Unknown') {
      const spfMatch = authResults.match(/spf=(pass|fail|neutral|softfail|none)/i);
      if (spfMatch && spfMatch[1]) data.auth.spf = spfMatch[1].toLowerCase();
      
      const dkimMatch = authResults.match(/dkim=(pass|fail|neutral|none)/i);
      if (dkimMatch && dkimMatch[1]) data.auth.dkim = dkimMatch[1].toLowerCase();
      
      const dmarcMatch = authResults.match(/dmarc=(pass|fail|neutral|none)/i);
      if (dmarcMatch && dmarcMatch[1]) data.auth.dmarc = dmarcMatch[1].toLowerCase();
    }

    const decodeQuotedPrintable = (str) => {
      if(!str) return '';
      try {
          let decoded = str.replace(/=\r?\n/g, ''); 
          decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
          return decoded;
      } catch(e) { return str; }
    };

    const boundaryMatch = rawEml.match(/boundary=["']?([^"'\r\n]+)["']?/i);
    let parts = boundaryMatch ? rawEml.split(boundaryMatch[1]) : [rawEml];

    let extractedAttachments = [];
    parts.forEach(part => {
        const splitPart = part.split(/\r?\n\r?\n/);
        if (splitPart.length < 2) return;
        const headers = splitPart[0];
        let content = splitPart.slice(1).join('\n\n').replace(/--\s*$/, '').trim();

        const nameMatch = headers.match(/(?:name|filename)\s*=\s*["']?([^"'\r\n;]+)["']?/i);
        const mimeTypeMatch = headers.match(/Content-Type:\s*([^;\r\n]+)/i);
        const isAttachment = headers.match(/Content-Disposition:\s*attachment/i) || nameMatch;

        if (isAttachment && nameMatch) {
            extractedAttachments.push({
                name: nameMatch[1].trim(),
                mimeType: mimeTypeMatch ? mimeTypeMatch[1].trim() : 'application/octet-stream',
                content: content,
                isBase64: /Content-Transfer-Encoding:\s*base64/i.test(headers)
            });
            return;
        }

        if (headers.match(/Content-Transfer-Encoding:\s*quoted-printable/i)) {
            content = decodeQuotedPrintable(content);
        } else if (headers.match(/Content-Transfer-Encoding:\s*base64/i)) {
            try {
               if(headers.match(/Content-Type:\s*text/i)) { 
                   content = new TextDecoder('utf-8').decode(Uint8Array.from(atob(content.replace(/\s/g, '')), c => c.charCodeAt(0)));
               }
            } catch(e){}
        }

        if (headers.match(/Content-Type:\s*text\/html/i) && !data.payload.htmlBody) {
            data.payload.htmlBody = content;
        } else if (headers.match(/Content-Type:\s*text\/plain/i) && !data.payload.textBody) {
            data.payload.textBody = content;
        }
    });

    if (!data.payload.htmlBody) {
        const htmlFallback = rawEml.match(/<html[^>]*>[\s\S]*?<\/html>/i);
        if (htmlFallback) {
            data.payload.htmlBody = rawEml.includes('quoted-printable') ? decodeQuotedPrintable(htmlFallback[0]) : htmlFallback[0];
        }
    }

    const fileMatches = [...rawEml.matchAll(/(?:name|filename)\s*=\s*["']?([^"'\r\n;]+)["']?/gi)];
    const fallbackNames = [...new Set(fileMatches.map(m => m[1].trim()))].map(name => ({
        name, mimeType: 'application/octet-stream', content: '', isBase64: false
    }));
    data.payload.attachments = extractedAttachments.length > 0 ? extractedAttachments : fallbackNames;

    const searchArea = rawEml + "\n" + data.payload.htmlBody + "\n" + data.payload.textBody;
    const urlRegex = /(?:https?|ftp):\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const urlMatches = [...searchArea.matchAll(urlRegex)];
    
    const uniqueUrls = [...new Set(urlMatches.map(m => m[0]))].filter(url => 
        !url.includes('w3.org') && !url.includes('schemas.microsoft.com') && !url.includes('google.com')
    );
    data.payload.urls = uniqueUrls;

    // Extract unique domains from URLs for IOC export
    data.payload.domains = [...new Set(uniqueUrls.map(url => {
        try { return new URL(url).hostname; } catch (e) { return null; }
    }).filter(Boolean))];

  } catch (err) {
    console.error("Error parsing EML:", err);
  }

  return data;
};

// ================================================================
// MITRE ATT&CK DETECTION ENGINE
// Each rule returns null or { id, name, tactic, url, confidence, evidence }
// Confidence: high | medium | low
// ================================================================
const SUSPICIOUS_TLDS = ['.zip', '.mov', '.top', '.xyz', '.click', '.link', '.tk', '.ml', '.ga', '.cf', '.icu', '.rest', '.country', '.support', '.fit'];
const URGENCY_KEYWORDS = ['urgent', 'immediately', 'suspended', 'verify', 'expire', 'expir', 'action required', 'unauthorized', 'restricted', 'limited', 'within 24', 'within 48', 'final notice', 'last chance', 'overdue', 'failure to'];
const SUSPICIOUS_ATTACH_EXT = /\.(exe|scr|js|jse|vbs|vbe|wsf|hta|lnk|bat|cmd|ps1|jar|iso|img|zip|rar|7z|docm|xlsm|pptm)$/i;
const PHISH_ATTACH_EXT = /\.(pdf|docx?|xlsx?|html?|htm)$/i;
const FREE_HOSTING_PROVIDERS = /(firebaseapp\.com|web\.app|netlify\.app|vercel\.app|github\.io|glitch\.me|repl\.co|pages\.dev|workers\.dev|000webhostapp\.com|weebly\.com|wixsite\.com|blogspot\.com|r2\.dev|onrender\.com)/i;
const URL_SHORTENERS = /(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|short\.io|tiny\.cc|shorturl\.at)/i;

// Auth helpers
const isAuthBad = (status) => ['fail', 'softfail'].includes(status);
const isAuthMissing = (status) => ['neutral', 'none'].includes(status);
const isAuthPass = (status) => status === 'pass';

const detectMitreTechniques = (data) => {
  const techniques = [];
  const subject = (data.basic.subject || '').toLowerCase();
  const body = ((data.payload.htmlBody || '') + ' ' + (data.payload.textBody || '')).toLowerCase();
  const fromAddr = (data.basic.from || '').toLowerCase();
  const replyTo = (data.basic.replyTo || '').toLowerCase();
  const hasUrls = data.payload.urls.length > 0;
  const hasAttachments = data.payload.attachments.length > 0;

  const authBad = isAuthBad(data.auth.spf) || isAuthBad(data.auth.dkim) || isAuthBad(data.auth.dmarc);
  const authNotPassing = !isAuthPass(data.auth.spf) && !isAuthPass(data.auth.dkim) && !isAuthPass(data.auth.dmarc);
  const matchedUrgency = URGENCY_KEYWORDS.filter(k => subject.includes(k) || body.includes(k));

  // T1566.002 - Spearphishing Link
  // Fire on ANY external URL; confidence varies by corroborating evidence
  if (hasUrls) {
    const evidence = [];
    let confidence = 'low';
    if (authBad) { evidence.push('Authentication failures (SPF/DKIM/DMARC)'); confidence = 'high'; }
    else if (authNotPassing) { evidence.push('No passing authentication (SPF/DKIM/DMARC absent or neutral)'); confidence = 'medium'; }
    if (matchedUrgency.length) {
      evidence.push(`Urgency keywords: ${matchedUrgency.slice(0,3).join(', ')}`);
      if (confidence === 'low') confidence = 'medium';
      else if (confidence === 'medium') confidence = 'high';
    }
    evidence.push(`${data.payload.urls.length} URL(s) extracted`);
    techniques.push({
      id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access',
      url: 'https://attack.mitre.org/techniques/T1566/002/',
      confidence, evidence
    });
  }

  // T1566.001 - Spearphishing Attachment
  if (hasAttachments) {
    const suspiciousFiles = data.payload.attachments.filter(a => SUSPICIOUS_ATTACH_EXT.test(a.name));
    const phishFiles = data.payload.attachments.filter(a => PHISH_ATTACH_EXT.test(a.name));
    if (suspiciousFiles.length || phishFiles.length) {
      const evidence = [];
      let confidence = 'low';
      if (suspiciousFiles.length) {
        evidence.push(`High-risk attachment(s): ${suspiciousFiles.map(a => a.name).join(', ')}`);
        confidence = 'high';
      }
      if (phishFiles.length) {
        evidence.push(`Document attachment(s): ${phishFiles.map(a => a.name).join(', ')}`);
        if (confidence === 'low') confidence = authBad || matchedUrgency.length ? 'medium' : 'low';
      }
      if (authBad) evidence.push('Authentication failures present');
      if (matchedUrgency.length) evidence.push('Combined with urgency language');
      techniques.push({
        id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access',
        url: 'https://attack.mitre.org/techniques/T1566/001/',
        confidence, evidence
      });
    }
  }

  // T1656 - Impersonation (brand spoofing in display name OR subject)
  const brands = ['paypal', 'microsoft', 'amazon', 'apple', 'google', 'netflix', 'dhl', 'fedex', 'ups', 'irs', 'bank', 'office365', 'office 365', 'docusign', 'adobe', 'linkedin', 'meta', 'facebook', 'instagram', 'whatsapp', 'chase', 'wells fargo', 'hsbc', 'barclays'];
  const fromDisplayMatch = data.basic.from.match(/^"?([^"<]+)"?\s*</);
  const fromDisplay = fromDisplayMatch ? fromDisplayMatch[1].toLowerCase().trim() : fromAddr;
  const fromDomain = (fromAddr.match(/@([^\s>]+)/) || [])[1] || '';
  const impersonatedBrand = brands.find(b => {
    const inSender = fromDisplay.includes(b) || subject.includes(b);
    const brandRoot = b.replace(/\s+/g, '');
    const domainMatchesBrand = fromDomain.includes(brandRoot);
    return inSender && !domainMatchesBrand;
  });
  if (impersonatedBrand) {
    techniques.push({
      id: 'T1656', name: 'Impersonation', tactic: 'Defense Evasion',
      url: 'https://attack.mitre.org/techniques/T1656/',
      confidence: 'high', 
      evidence: [
        `Sender claims "${impersonatedBrand}" but envelope domain is "${fromDomain || 'unknown'}"`,
        'Likely brand spoofing for social engineering'
      ]
    });
  }

  // T1534 - Reply-To / From mismatch
  if (data.basic.replyTo !== 'Unknown' && replyTo) {
    const replyDomain = (replyTo.match(/@([^\s>]+)/) || [])[1] || '';
    if (replyDomain && fromDomain && replyDomain !== fromDomain) {
      techniques.push({
        id: 'T1534', name: 'Internal Spearphishing', tactic: 'Lateral Movement',
        url: 'https://attack.mitre.org/techniques/T1534/',
        confidence: 'medium',
        evidence: [
          `Reply-To domain (${replyDomain}) differs from From domain (${fromDomain})`,
          'Response redirection indicates infrastructure separation'
        ]
      });
    }
  }

  // T1071.001 - Web Protocols (free hosting C2/staging)
  const freeHostingHit = data.payload.urls.find(u => FREE_HOSTING_PROVIDERS.test(u));
  if (freeHostingHit) {
    const provider = freeHostingHit.match(FREE_HOSTING_PROVIDERS)[1];
    techniques.push({
      id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control',
      url: 'https://attack.mitre.org/techniques/T1071/001/',
      confidence: 'medium',
      evidence: [
        `URL hosted on free/abusable platform: ${provider}`,
        'Free hosting commonly used to stage credential-harvest pages'
      ]
    });
  }

  // T1598.003 - Spearphishing for Information (credential harvesting)
  const credKeywords = ['login', 'verify', 'sign in', 'sign-in', 'password', 'account', 'confirm identity', 'update payment', 'credentials', 'authenticate', 'unlock account'];
  const matchedCred = credKeywords.filter(k => body.includes(k));
  if (hasUrls && matchedCred.length >= 2) {
    techniques.push({
      id: 'T1598.003', name: 'Spearphishing for Information', tactic: 'Reconnaissance',
      url: 'https://attack.mitre.org/techniques/T1598/003/',
      confidence: 'medium',
      evidence: [
        `Credential-solicitation language: ${matchedCred.slice(0,4).join(', ')}`,
        'Combined with embedded link(s)'
      ]
    });
  }

  // T1036 - Masquerading (suspicious TLD or URL shortener)
  const suspiciousTldHit = data.payload.urls.find(u => SUSPICIOUS_TLDS.some(tld => {
    try { return new URL(u).hostname.endsWith(tld); } catch { return false; }
  }));
  const shortenerHit = data.payload.urls.find(u => URL_SHORTENERS.test(u));
  if (suspiciousTldHit || shortenerHit) {
    const evidence = [];
    if (suspiciousTldHit) {
      try { evidence.push(`Suspicious TLD in URL: ${new URL(suspiciousTldHit).hostname}`); } catch {}
    }
    if (shortenerHit) evidence.push(`URL shortener detected: ${shortenerHit.match(URL_SHORTENERS)[1]}`);
    evidence.push('Commonly used to obscure final destination');
    techniques.push({
      id: 'T1036', name: 'Masquerading', tactic: 'Defense Evasion',
      url: 'https://attack.mitre.org/techniques/T1036/',
      confidence: shortenerHit ? 'medium' : 'low',
      evidence
    });
  }

  return techniques;
};

// Detect base risk indicators that always contribute to score
// (independent of full MITRE rule firings — these are atomic suspicious traits)
const detectBaseIndicators = (data) => {
  const indicators = [];
  const subject = (data.basic.subject || '').toLowerCase();
  const body = ((data.payload.htmlBody || '') + ' ' + (data.payload.textBody || '')).toLowerCase();
  const fromAddr = (data.basic.from || '').toLowerCase();
  const fromDomain = (fromAddr.match(/@([^\s>]+)/) || [])[1] || '';
  const returnPath = (data.network.returnPath || '').toLowerCase();
  const returnDomain = (returnPath.match(/@([^\s>]+)/) || [])[1] || '';

  // Return-Path / From mismatch
  if (returnDomain && fromDomain && returnDomain !== fromDomain) {
    indicators.push({ label: 'Return-Path domain differs from From', weight: 12 });
  }

  // X-Mailer telling on itself
  const xMailer = (data.network.xMailer || '').toLowerCase();
  if (xMailer && /(php\s*mailer|bulk|mass|sendgrid trial|smtp\.js)/i.test(xMailer)) {
    indicators.push({ label: `Suspicious X-Mailer: ${data.network.xMailer}`, weight: 10 });
  }

  // Urgency language alone (even without URLs)
  const matchedUrgency = URGENCY_KEYWORDS.filter(k => subject.includes(k) || body.includes(k));
  if (matchedUrgency.length >= 2) {
    indicators.push({ label: `Multiple urgency cues (${matchedUrgency.length})`, weight: 8 });
  } else if (matchedUrgency.length === 1) {
    indicators.push({ label: `Urgency cue: "${matchedUrgency[0]}"`, weight: 4 });
  }

  // ALL CAPS subject (>50% caps and >10 chars)
  const subjRaw = data.basic.subject || '';
  if (subjRaw.length > 10) {
    const letters = subjRaw.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 5) {
      const caps = (subjRaw.match(/[A-Z]/g) || []).length;
      if (caps / letters.length > 0.5) {
        indicators.push({ label: 'Subject uses excessive capitalization', weight: 3 });
      }
    }
  }

  // No DMARC policy / SPF none
  if (data.auth.dmarc === 'none' || data.auth.dmarc === 'neutral') {
    indicators.push({ label: 'No DMARC enforcement', weight: 5 });
  }
  if (data.auth.spf === 'none') {
    indicators.push({ label: 'No SPF record published', weight: 5 });
  }

  // Originating IP outside common provider ranges (heuristic: not first received)
  // Cheap signal: if originatingIp exists and hopCount > 0, flag if it's the only hop
  if (data.network.originatingIp !== 'Unknown' && data.network.hopCount <= 2) {
    indicators.push({ label: 'Short delivery chain (possible direct-to-MX)', weight: 4 });
  }

  // Sender domain looks like brand+keyword (e.g. billing-paypal-secure.com)
  if (fromDomain) {
    const brandsForLookalike = ['paypal', 'microsoft', 'amazon', 'apple', 'google', 'netflix', 'dhl', 'fedex', 'docusign', 'office365', 'chase'];
    const lookalike = brandsForLookalike.find(b => 
      fromDomain.includes(b) && !fromDomain.startsWith(`${b}.`) && fromDomain !== `${b}.com`
    );
    if (lookalike) {
      indicators.push({ label: `Sender domain contains brand "${lookalike}" but is not legitimate`, weight: 15 });
    }
    // Excessive hyphens / numbers in subdomain
    if ((fromDomain.match(/-/g) || []).length >= 3) {
      indicators.push({ label: 'Sender domain has excessive hyphens', weight: 5 });
    }
  }

  return indicators;
};

// ================================================================
// THREAT SCORE (0-100)
// ================================================================
const calculateThreatScore = (data, techniques, baseIndicators = []) => {
  let score = 0;
  const factors = [];

  // Authentication posture
  if (data.auth.spf === 'fail') { score += 18; factors.push('SPF fail (+18)'); }
  else if (data.auth.spf === 'softfail') { score += 10; factors.push('SPF softfail (+10)'); }
  else if (data.auth.spf === 'none') { score += 4; factors.push('No SPF record (+4)'); }

  if (data.auth.dkim === 'fail') { score += 15; factors.push('DKIM fail (+15)'); }
  else if (data.auth.dkim === 'none' || data.auth.dkim === 'neutral') { score += 3; factors.push('DKIM not signed (+3)'); }

  if (data.auth.dmarc === 'fail') { score += 18; factors.push('DMARC fail (+18)'); }
  else if (data.auth.dmarc === 'none') { score += 4; factors.push('No DMARC policy (+4)'); }

  // MITRE techniques
  techniques.forEach(t => {
    const pts = t.confidence === 'high' ? 18 : t.confidence === 'medium' ? 10 : 5;
    score += pts;
    factors.push(`${t.id} ${t.confidence} (+${pts})`);
  });

  // Base indicators
  baseIndicators.forEach(ind => {
    score += ind.weight;
    factors.push(`${ind.label} (+${ind.weight})`);
  });

  score = Math.min(100, Math.max(0, score));
  return { score, factors };
};

// ================================================================
// IOC EXPORT GENERATORS
// ================================================================
const generateCSV = (data) => {
  const rows = [['type', 'value', 'context', 'source']];
  if (data.network.originatingIp !== 'Unknown') {
    rows.push(['ipv4-addr', data.network.originatingIp, 'Originating mail server', 'Received header']);
  }
  data.payload.domains.forEach(d => rows.push(['domain-name', d, 'Extracted from URL', 'Email body']));
  data.payload.urls.forEach(u => rows.push(['url', u, 'Embedded link', 'Email body']));
  data.payload.attachments.forEach(a => rows.push(['file-name', a.name, a.mimeType, 'Email attachment']));
  const fromDomain = ((data.basic.from || '').match(/@([^\s>]+)/) || [])[1];
  if (fromDomain) rows.push(['domain-name', fromDomain, 'Sender domain', 'From header']);
  if (data.basic.from !== 'Unknown') {
    const emailMatch = data.basic.from.match(/<([^>]+)>/) || data.basic.from.match(/([\w.+-]+@[\w.-]+)/);
    if (emailMatch) rows.push(['email-addr', emailMatch[1], 'Sender address', 'From header']);
  }
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
};

const generateSTIX = (data) => {
  const now = new Date().toISOString();
  const objects = [];
  const bundleId = `bundle--${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  
  const makeIndicator = (pattern, name) => ({
    type: 'indicator',
    spec_version: '2.1',
    id: `indicator--${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    created: now, modified: now,
    name, pattern, pattern_type: 'stix', valid_from: now,
    labels: ['malicious-activity']
  });

  if (data.network.originatingIp !== 'Unknown') {
    objects.push(makeIndicator(`[ipv4-addr:value = '${data.network.originatingIp}']`, `Originating IP: ${data.network.originatingIp}`));
  }
  data.payload.domains.forEach(d => {
    objects.push(makeIndicator(`[domain-name:value = '${d}']`, `Phishing domain: ${d}`));
  });
  data.payload.urls.forEach(u => {
    const escaped = u.replace(/'/g, "\\'");
    objects.push(makeIndicator(`[url:value = '${escaped}']`, `Phishing URL: ${u.slice(0, 80)}`));
  });
  data.payload.attachments.forEach(a => {
    objects.push(makeIndicator(`[file:name = '${a.name.replace(/'/g, "\\'")}']`, `Attachment: ${a.name}`));
  });

  return JSON.stringify({
    type: 'bundle',
    id: bundleId,
    objects
  }, null, 2);
};

// KQL: Microsoft Defender XDR / Sentinel
// Defender for Office 365 tables: EmailEvents, EmailUrlInfo, EmailAttachmentInfo
// For generic Sentinel, swap: EmailEvents -> CommonSecurityLog, SenderFromAddress -> SourceUserName, etc.
const generateKQL = (data) => {
  const urls = data.payload.urls.map(u => `"${u}"`).join(', ');
  const domains = data.payload.domains.map(d => `"${d}"`).join(', ');
  const ip = data.network.originatingIp;
  const fromAddr = ((data.basic.from || '').match(/<([^>]+)>/) || [])[1] || data.basic.from;
  const attachNames = data.payload.attachments.map(a => `"${a.name}"`).join(', ');

  return `// =====================================================================
// SOC Auto-Triage — Microsoft Defender XDR / Sentinel Hunt Queries
// Schema: Microsoft 365 Defender Advanced Hunting (EmailEvents, EmailUrlInfo, EmailAttachmentInfo, DeviceNetworkEvents)
// 
// For generic SIEMs, substitute as follows:
//   EmailEvents              -> your mail-flow log table
//   SenderFromAddress        -> sender / smtp.mailfrom field
//   RecipientEmailAddress    -> recipient field
//   Url                      -> url / dest_url
//   DeviceNetworkEvents      -> proxy or firewall outbound table
//   RemoteIP                 -> destination IP field
// =====================================================================

// [1] Find other emails from the same sender (last 30d)
EmailEvents
| where Timestamp > ago(30d)
| where SenderFromAddress =~ "${fromAddr}"
| project Timestamp, NetworkMessageId, SenderFromAddress, RecipientEmailAddress, Subject, DeliveryAction, ThreatTypes
| order by Timestamp desc

// [2] Find users who clicked any of the malicious URLs
EmailUrlInfo
| where Url in~ (${urls || '""'})
| join kind=inner (EmailEvents | where Timestamp > ago(30d)) on NetworkMessageId
| project Timestamp, RecipientEmailAddress, Url, Subject, SenderFromAddress
| order by Timestamp desc

// [3] Endpoint traffic to phishing domains (post-delivery click detection)
DeviceNetworkEvents
| where Timestamp > ago(7d)
| where RemoteUrl has_any (${domains || '""'})
| project Timestamp, DeviceName, InitiatingProcessAccountName, InitiatingProcessFileName, RemoteUrl, RemoteIP, ActionType
| order by Timestamp desc

// [4] Inbound mail from the originating IP (sender infrastructure reuse)
EmailEvents
| where Timestamp > ago(30d)
| where SenderIPv4 == "${ip}"
| summarize EmailCount=count(), UniqueSenders=dcount(SenderFromAddress), 
            Recipients=make_set(RecipientEmailAddress, 100), 
            Subjects=make_set(Subject, 50) by SenderIPv4
| extend ThreatLevel = iff(UniqueSenders > 5, "HIGH - Likely compromised infrastructure", "MEDIUM")

// [5] Attachments with matching filenames across tenant
EmailAttachmentInfo
| where Timestamp > ago(30d)
| where FileName in~ (${attachNames || '""'})
| join kind=inner EmailEvents on NetworkMessageId
| project Timestamp, FileName, SHA256, FileType, SenderFromAddress, RecipientEmailAddress, Subject
| order by Timestamp desc

// [6] Detonate the IOCs — Threat Intelligence correlation
// (Requires ThreatIntelligenceIndicator table from Sentinel TI connectors)
ThreatIntelligenceIndicator
| where ExpirationDateTime > now() and Active == true
| where NetworkIP == "${ip}"
   or NetworkDomain in~ (${domains || '""'})
   or Url in~ (${urls || '""'})
| project IndicatorId, Description, ThreatType, ConfidenceScore, NetworkIP, NetworkDomain, Url
`;
};

// SPL: Splunk
const generateSPL = (data) => {
  const urlList = data.payload.urls.map(u => `"${u}"`).join(' OR url=');
  const domainList = data.payload.domains.map(d => `"${d}"`).join(' OR ');
  const ip = data.network.originatingIp;
  const fromAddr = ((data.basic.from || '').match(/<([^>]+)>/) || [])[1] || data.basic.from;
  const attachList = data.payload.attachments.map(a => `"${a.name}"`).join(' OR filename=');

  return `# =====================================================================
# SOC Auto-Triage — Splunk Hunt Queries (SPL)
# Default sourcetypes assume Splunk for O365 / Splunk_TA_microsoft-cloudservices
# Substitute as needed:
#   sourcetype=ms:o365:management       -> your mail-flow sourcetype
#   sourcetype=ms:defender:atp:alerts   -> your EDR sourcetype
#   sourcetype=stream:http              -> your proxy/web sourcetype
# =====================================================================

# [1] Other emails from the same sender (last 30d)
search earliest=-30d sourcetype=ms:o365:management sender_address="${fromAddr}"
| table _time, network_message_id, sender_address, recipient_address, subject, delivery_action
| sort -_time

# [2] Mail containing any of the malicious URLs
search earliest=-30d sourcetype=ms:o365:management (url=${urlList || '""'})
| table _time, recipient_address, subject, sender_address, url
| sort -_time

# [3] Proxy / web traffic to phishing domains (clicked links)
search earliest=-7d sourcetype=stream:http (${domainList ? 'site=' + domainList : 'site=""'})
| stats count by src_ip, user, site, url
| sort -count

# [4] Other inbound mail from originating IP
search earliest=-30d sourcetype=ms:o365:management src_ip="${ip}"
| stats count as email_count dc(sender_address) as unique_senders values(recipient_address) as recipients values(subject) as subjects by src_ip
| eval threat_level=if(unique_senders>5, "HIGH - Likely compromised infrastructure", "MEDIUM")

# [5] Attachments with matching filenames across estate
search earliest=-30d sourcetype=ms:o365:management (filename=${attachList || '""'})
| table _time, filename, file_hash, sender_address, recipient_address, subject
| sort -_time

# [6] Endpoint process activity tied to the IOCs (Sysmon/EDR)
search earliest=-7d sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" 
       (DestinationIp="${ip}" OR DestinationHostname IN (${data.payload.domains.map(d => `"${d}"`).join(', ') || '""'}))
| table _time, host, user, Image, DestinationIp, DestinationHostname
| sort -_time
`;
};

// ================================================================
// UI COMPONENTS
// ================================================================
const Badge = ({ status, text }) => {
  let colors = "bg-slate-700/50 text-slate-300 border-slate-600";
  let Icon = Info;
  if (status === 'pass') {
    colors = "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
    Icon = CheckCircle;
  } else if (status === 'fail' || status === 'softfail') {
    colors = "bg-rose-900/30 text-rose-400 border-rose-800/50";
    Icon = AlertTriangle;
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border text-xs font-semibold tracking-wide ${colors} backdrop-blur-sm shadow-sm`}>
      <Icon size={14} />
      <span>{text}: {status.toUpperCase()}</span>
    </div>
  );
};

const SectionCard = ({ title, icon: Icon, children, className = "", action = null }) => (
  <div className={`bg-slate-800/60 backdrop-blur-md border border-slate-700/60 rounded-xl overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-slate-800/80 ${className}`}>
    <div className="bg-slate-800/80 px-5 py-3.5 border-b border-slate-700/60 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-1.5 bg-blue-500/10 rounded-lg">
          <Icon className="text-blue-400" size={18} />
        </div>
        <h3 className="font-semibold text-slate-100 tracking-wide">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="p-5 text-sm text-slate-300 space-y-4">
      {children}
    </div>
  </div>
);

const CopyButton = ({ text, className = "" }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const fallbackCopyTextToClipboard = (textToCopy) => {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
      document.body.removeChild(textArea);
    };

    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      fallbackCopyTextToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button 
      onClick={handleCopy}
      className={`text-xs bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded-md text-slate-200 transition-colors shrink-0 border border-slate-600 font-medium shadow-sm ${className}`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const downloadFile = (content, filename, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// MITRE Technique Card
const MitreCard = ({ technique }) => {
  const confColors = {
    high: 'bg-rose-900/30 text-rose-300 border-rose-800/50',
    medium: 'bg-amber-900/30 text-amber-300 border-amber-800/50',
    low: 'bg-slate-700/50 text-slate-300 border-slate-600'
  };
  
  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-4 hover:border-blue-500/50 transition-all shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <a 
            href={technique.url} target="_blank" rel="noreferrer" 
            className="text-blue-400 hover:text-blue-300 font-bold font-mono text-sm flex items-center gap-1.5"
          >
            {technique.id} <ExternalLink size={11} />
          </a>
          <div className="text-slate-100 font-semibold text-sm mt-0.5">{technique.name}</div>
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{technique.tactic}</div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${confColors[technique.confidence]}`}>
          {technique.confidence}
        </span>
      </div>
      <ul className="mt-3 space-y-1 border-t border-slate-700/50 pt-2">
        {technique.evidence.map((ev, i) => (
          <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-snug">
            <span className="text-blue-500 mt-1">•</span>
            <span>{ev}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Threat Score Gauge
const ThreatScore = ({ score, factors }) => {
  const level = score >= 70 ? 'critical' : score >= 40 ? 'high' : score >= 20 ? 'medium' : 'low';
  const levelMeta = {
    critical: { color: 'text-rose-400', bg: 'from-rose-600 to-rose-400', ring: 'stroke-rose-500', label: 'CRITICAL' },
    high: { color: 'text-orange-400', bg: 'from-orange-600 to-orange-400', ring: 'stroke-orange-500', label: 'HIGH' },
    medium: { color: 'text-amber-400', bg: 'from-amber-600 to-amber-400', ring: 'stroke-amber-500', label: 'MEDIUM' },
    low: { color: 'text-emerald-400', bg: 'from-emerald-600 to-emerald-400', ring: 'stroke-emerald-500', label: 'LOW' }
  };
  const meta = levelMeta[level];
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-slate-700" strokeWidth="8" fill="none" />
          <circle 
            cx="50" cy="50" r="42" 
            className={meta.ring}
            strokeWidth="8" fill="none" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${meta.color}`}>{score}</span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${meta.color}`}>{meta.label} Risk</div>
        <div className="text-[11px] text-slate-400 leading-snug mb-2">Heuristic score derived from auth posture + detected ATT&CK techniques.</div>
        {factors.length > 0 && (
          <details className="text-[10px] text-slate-500">
            <summary className="cursor-pointer hover:text-slate-300 font-semibold">Scoring breakdown</summary>
            <ul className="mt-1.5 space-y-0.5 pl-2">
              {factors.map((f, i) => <li key={i} className="font-mono">{f}</li>)}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
};

const SandboxModal = ({ attachment, onClose }) => {
  const [renderConfirmed, setRenderConfirmed] = useState(false);
  
  if (!attachment) return null;

  const isImage = attachment.mimeType.startsWith('image/');
  const dataUri = `data:${attachment.mimeType}${attachment.isBase64 ? ';base64' : ''},${attachment.content}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <ShieldCheck className="text-emerald-400 shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-slate-200 truncate">{attachment.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{attachment.mimeType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={dataUri}
              download={attachment.name + '.malware'}
              className="bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-800/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
              title="Download safely as .malware"
            >
              <Download size={14} /> Safe Download
            </a>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-[#0d1117] relative p-4 flex items-center justify-center overflow-auto custom-scrollbar">
          {isImage ? (
            <img src={dataUri} alt={attachment.name} className="max-w-full max-h-full object-contain rounded shadow-lg" />
          ) : renderConfirmed ? (
            <iframe 
              src={dataUri} 
              sandbox="" 
              title="Attachment Sandbox" 
              className="w-full h-full bg-white rounded shadow-lg border-0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center max-w-md bg-slate-900 border border-rose-900/50 p-8 rounded-xl shadow-2xl">
              <AlertTriangle className="text-rose-500 w-16 h-16 mb-4" />
              <h4 className="text-lg font-bold text-slate-200 mb-2">Potentially Unsafe Content</h4>
              <p className="text-sm text-slate-400 mb-6">You are attempting to render a complex document format ({attachment.mimeType}). Even inside a sandbox, browser vulnerabilities can occasionally be exploited.</p>
              <button 
                onClick={() => setRenderConfirmed(true)} 
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-rose-900/50"
              >
                Render Document Anyway
              </button>
            </div>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 text-xs font-semibold flex items-center gap-2 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sandboxed Environment Active
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// MAIN APP
// ================================================================
export default function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [isDefanged, setIsDefanged] = useState(true);
  const [rawViewMode, setRawViewMode] = useState('headers');
  const [sandboxAttachment, setSandboxAttachment] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [iocTab, setIocTab] = useState('kql');
  const fileInputRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [ctfAnswers, setCtfAnswers] = useState({
    reverseDns: '', hostingService: '', headingText: '', threatType: '', remediation: ''
  });

  // Memoized intelligence layer
  const intel = useMemo(() => {
    if (!parsedData) return null;
    const techniques = detectMitreTechniques(parsedData);
    const baseIndicators = detectBaseIndicators(parsedData);
    const threat = calculateThreatScore(parsedData, techniques, baseIndicators);
    return {
      techniques,
      baseIndicators,
      threat,
      exports: {
        kql: generateKQL(parsedData),
        spl: generateSPL(parsedData),
        csv: generateCSV(parsedData),
        stix: generateSTIX(parsedData)
      }
    };
  }, [parsedData]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleProcessFile = (text, fileName = "Unknown File") => {
    const result = parseEmail(text);
    const newId = Date.now().toString();
    const historyRecord = {
      id: newId,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
      fileName: fileName,
      subject: result.basic.subject,
      data: result,
      ctf: { reverseDns: '', hostingService: '', headingText: '', threatType: '', remediation: '' }
    };

    setParsedData(result);
    setActiveHistoryId(newId);
    setHistory(prev => [historyRecord, ...prev]);
    setIsDefanged(true); 
    setCtfAnswers({ reverseDns: '', hostingService: '', headingText: '', threatType: '', remediation: '' });
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const loadFromHistory = (record) => {
    setHistory(prev => prev.map(item => 
      item.id === activeHistoryId ? { ...item, ctf: ctfAnswers } : item
    ));
    setParsedData(record.data);
    setActiveHistoryId(record.id);
    setCtfAnswers(record.ctf || { reverseDns: '', hostingService: '', headingText: '', threatType: '', remediation: '' });
    setIsDefanged(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setActiveHistoryId(null);
    setParsedData(null);
  };

  const updateCtf = (field, value) => {
    setCtfAnswers(prev => ({ ...prev, [field]: value }));
  };

  const exportReport = async () => {
    if (!parsedData) return;
    setIsExporting(true);
    try {
      const element = document.getElementById('soc-report-content');
      if (!element) return;
      const imgData = await toPng(element, { pixelRatio: 2, backgroundColor: '#0f172a' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SOC_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => handleProcessFile(event.target.result, file.name);
      reader.readAsText(file);
    }
  }, []);

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => handleProcessFile(event.target.result, file.name);
      reader.readAsText(file);
    }
  };

  const currentExport = intel?.exports[iocTab] || '';
  const exportFilename = {
    kql: `hunt_queries_${Date.now()}.kql`,
    spl: `hunt_queries_${Date.now()}.spl`,
    csv: `iocs_${Date.now()}.csv`,
    stix: `iocs_${Date.now()}.json`
  }[iocTab];

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30">
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; border: 2px solid #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        .terminal-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-color: #0d1117;}
        .glass-panel { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(51, 65, 85, 0.5); }
      `}} />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0 lg:w-0'} bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] lg:shadow-none`}>
        <div className={`w-80 h-full flex flex-col absolute lg:relative right-0 ${!isSidebarOpen ? 'lg:hidden' : ''}`}>
          <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/50">
            <h2 className="font-bold text-slate-100 flex items-center space-x-2">
              <Clock size={18} className="text-blue-400" />
              <span>Session History</span>
            </h2>
            <div className="flex items-center space-x-1">
              {history.length > 0 && (
                <button onClick={handleClearHistory} className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-md hover:bg-slate-800" title="Clear Session">
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800" title="Close Sidebar">
                <X size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center text-slate-500 px-4">
                <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mb-3">
                  <Mail size={20} className="text-slate-600"/>
                </div>
                <p className="text-sm">No emails analyzed in this session.</p>
              </div>
            ) : (
              history.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => loadFromHistory(item)}
                  className={`group p-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${activeHistoryId === item.id ? 'bg-blue-600/15 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/60 hover:border-slate-600/80'}`}
                >
                  <div className="flex justify-between items-start mb-1.5 gap-2">
                    <span className={`text-xs font-mono truncate ${activeHistoryId === item.id ? 'text-blue-300 font-semibold' : 'text-slate-400 group-hover:text-slate-300'}`} title={item.fileName}>
                      {item.fileName}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0 font-medium bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">{item.timestamp}</span>
                  </div>
                  <div className={`text-sm font-medium truncate ${activeHistoryId === item.id ? 'text-blue-100' : 'text-slate-300'}`} title={item.subject}>
                    {item.subject}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-slate-800 bg-slate-900/30 text-center">
            <p className="text-[11px] text-slate-500/80 font-medium">Data remains strictly local to this browser session.</p>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-slate-950">
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-800/80 glass-panel flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-slate-400 hover:text-white transition-colors p-2 bg-slate-800/50 hover:bg-slate-700 rounded-md border border-slate-700/50" title="Open History">
                <Menu size={18} />
              </button>
            )}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                <ShieldAlert className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 tracking-tight">
                  SOC Auto-Triage
                </h1>
                <div className="hidden sm:flex items-center text-xs text-slate-400 font-medium mt-0.5">
                  <span className="flex h-2 w-2 relative mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Local Session Secure
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {parsedData && (
              <button 
                onClick={() => { setParsedData(null); setActiveHistoryId(null); setIsDefanged(true); }} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm font-semibold transition-all border border-slate-700 hover:border-slate-500 shadow-sm flex items-center gap-2 group"
              >
                <span className="hidden sm:inline">Analyze New</span>
                <UploadCloud size={16} className="text-blue-400 group-hover:text-blue-300" />
              </button>
            )}
          </div>
        </header>

        {/* Dashboard */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Upload State */}
            {!parsedData && (
              <div className="h-[calc(100vh-12rem)] min-h-[400px] flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                <div 
                  className={`w-full max-w-2xl border-2 border-dashed rounded-3xl p-10 md:p-16 text-center transition-all duration-300 ${
                    isDragging ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-2xl shadow-blue-500/20' : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 hover:border-slate-500 backdrop-blur-sm'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                >
                  <div className="flex flex-col items-center justify-center space-y-5">
                    <div className={`p-5 rounded-2xl transition-colors duration-300 ${isDragging ? 'bg-blue-500/20' : 'bg-slate-800/80 shadow-inner'}`}>
                      <UploadCloud size={56} className={`${isDragging ? 'text-blue-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-100">Drop Email File Here</h3>
                      <p className="text-slate-400 mt-2 font-medium">Supports .eml or .txt formats</p>
                    </div>
                    <input type="file" className="hidden" ref={fileInputRef} accept=".eml,.txt" onChange={onFileSelect}/>
                    
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-8 w-full sm:w-auto pt-4 border-t border-slate-700/50">
                      <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 w-full sm:w-auto flex items-center justify-center gap-2">
                        <Search size={18}/> Browse Local Files
                      </button>
                      <button onClick={() => handleProcessFile(DEMO_EML, "demo_malware_paypal.eml")} className="bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-200 px-8 py-3 rounded-xl font-semibold transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                        <ShieldAlert size={18} className="text-rose-400"/> Load Demo Malware
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard */}
            {parsedData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                
                {/* THREAT INTELLIGENCE — full-width banner row */}
                {intel && (
                  <div className="lg:col-span-2">
                    <SectionCard 
                      title="Threat Intelligence" 
                      icon={Crosshair}
                      className="border-rose-900/40 bg-gradient-to-br from-slate-800/60 to-rose-950/10"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Score and Base Indicators */}
                        <div className="lg:col-span-1 bg-slate-900/60 p-5 rounded-lg border border-slate-700/60 shadow-inner flex flex-col">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity size={14} className="text-rose-400" />
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Threat Score</h4>
                          </div>
                          <ThreatScore score={intel.threat.score} factors={intel.threat.factors} />

                          {intel.baseIndicators && intel.baseIndicators.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-slate-700/50 flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={14} className="text-orange-400" />
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suspicious Indicators</h4>
                              </div>
                              <ul className="space-y-2">
                                {intel.baseIndicators.map((ind, i) => (
                                  <li key={i} className="text-[11px] bg-slate-800/80 p-2 rounded border border-slate-700/50 text-slate-300 flex justify-between items-start gap-2 shadow-sm">
                                    <span className="flex-1">{ind.label}</span>
                                    <span className="text-rose-400 font-bold shrink-0">+{ind.weight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* MITRE Techniques */}
                        <div className="lg:col-span-2">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Zap size={14} className="text-amber-400" />
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                MITRE ATT&CK Mapping ({intel.techniques.length})
                              </h4>
                            </div>
                            <a href="https://attack.mitre.org/" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1">
                              attack.mitre.org <ExternalLink size={9}/>
                            </a>
                          </div>
                          {intel.techniques.length === 0 ? (
                            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-6 text-center">
                              <ShieldCheck className="mx-auto text-emerald-500 mb-2" size={32} />
                              <p className="text-sm text-emerald-300 font-semibold">No ATT&CK techniques triggered</p>
                              <p className="text-[11px] text-slate-400 mt-1">Heuristic detection found no clear adversary patterns in this email.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {intel.techniques.map(t => <MitreCard key={t.id} technique={t} />)}
                            </div>
                          )}
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Routing & Metadata */}
                <SectionCard title="Routing & Metadata" icon={Server}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-3 items-center">
                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">From</span>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 text-slate-200 font-medium">{parsedData.basic.from}</span>
                      </div>
                      
                      {parsedData.basic.replyTo !== 'Unknown' && (
                        <>
                          <span className="text-rose-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">Reply-To <AlertTriangle size={10}/></span>
                          <span className="truncate bg-rose-950/40 px-2 py-1 rounded border border-rose-800/50 text-rose-300 font-medium">{parsedData.basic.replyTo}</span>
                        </>
                      )}

                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Return-Path</span>
                      <span className="truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 text-slate-400">{parsedData.network.returnPath}</span>

                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">To</span>
                      <span className="truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 text-slate-200">{parsedData.basic.to}</span>
                      
                      {parsedData.basic.cc !== 'Unknown' && (
                        <>
                          <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">CC</span>
                          <span className="truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50 text-slate-400">{parsedData.basic.cc}</span>
                        </>
                      )}
                      
                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Subject</span>
                      <span className="truncate font-semibold text-white bg-slate-800/50 px-2 py-1 rounded" title={parsedData.basic.subject}>{parsedData.basic.subject}</span>
                      
                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Date</span>
                      <div className="flex flex-col justify-center">
                        <span className="truncate text-slate-300 text-sm">{parsedData.basic.date}</span>
                        {parsedData.basic.utcDate !== 'Unknown' && (
                           <span className="text-[10px] text-slate-500 font-mono">UTC: {parsedData.basic.utcDate}</span>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-slate-700/50 w-full my-4"></div>
                    
                    <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-3 items-center">
                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Origin IP</span>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-300 font-mono bg-blue-900/20 px-2.5 py-1 rounded border border-blue-800/40 shadow-sm">{parsedData.network.originatingIp}</span>
                      </div>
                      
                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Message-ID</span>
                      <span className="truncate text-slate-400 font-mono text-[11px]">{parsedData.basic.messageId}</span>

                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">X-Mailer</span>
                      <span className="truncate text-slate-400">{parsedData.network.xMailer}</span>
                      
                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Priority</span>
                      <span className={`truncate ${parsedData.basic.priority.toLowerCase().includes('high') || parsedData.basic.priority.includes('1') ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {parsedData.basic.priority}
                      </span>
                      
                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Content-Type</span>
                      <span className="truncate text-slate-400 text-xs font-mono">{parsedData.basic.contentType}</span>

                      <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider self-start mt-1">Routing Hops</span>
                      <div className="space-y-1.5 mt-1">
                        <div className="text-slate-400 text-[11px] mb-2">{parsedData.network.hopCount} server(s) recorded in transit:</div>
                        {parsedData.network.routingPath.map((hop, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[10px] font-mono bg-slate-900/60 p-2 rounded border border-slate-700/50 shadow-inner">
                            <span className="text-slate-500 font-bold shrink-0 mt-0.5">{idx + 1}.</span>
                            <div className="flex flex-col gap-0.5 overflow-hidden">
                              <span className="text-slate-300 truncate"><span className="text-slate-500">From:</span> {hop.from}</span>
                              <span className="text-slate-300 truncate"><span className="text-slate-500">By:</span> {hop.by}</span>
                              {hop.ip !== 'None' && <span className="text-blue-400"><span className="text-slate-500">IP:</span> {hop.ip}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <div className="space-y-6 flex flex-col">
                  <SectionCard title="Authentication Checks" icon={ShieldCheck} className="flex-none">
                    <div className="flex flex-wrap gap-3">
                      <Badge text="SPF" status={parsedData.auth.spf} />
                      <Badge text="DKIM" status={parsedData.auth.dkim} />
                      <Badge text="DMARC" status={parsedData.auth.dmarc} />
                    </div>
                    {['fail', 'softfail', 'none'].some(s => [parsedData.auth.spf, parsedData.auth.dkim].includes(s)) && (
                      <div className="mt-4 text-xs text-rose-200 bg-rose-950/30 p-3 rounded-lg border border-rose-900/50 flex items-start gap-2 shadow-inner">
                        <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5"/>
                        <p><strong>Warning:</strong> Authentication failures indicate high probability of domain spoofing. Verify Return-Path aligns with From address.</p>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Extracted Payload Indicators" icon={LinkIcon} className="flex-1">
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <FileText size={14} className="text-orange-400"/> Attachments ({parsedData.payload.attachments.length})
                        </h4>
                        {parsedData.payload.attachments.length === 0 ? (
                          <span className="text-sm italic text-slate-500">No file attachments detected.</span>
                        ) : (
                          <ul className="space-y-2">
                            {parsedData.payload.attachments.map((att, i) => (
                              <li key={i} className="text-sm bg-slate-900/80 px-3 py-2.5 rounded-md border border-slate-700/80 flex items-center justify-between font-mono text-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span> 
                                  <span className="truncate">{att.name}</span>
                                </div>
                                {att.content && (
                                  <button 
                                    onClick={() => setSandboxAttachment(att)}
                                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-xs font-sans font-bold flex items-center gap-1.5 transition-colors ml-3 shrink-0"
                                  >
                                    <Search size={12}/> Sandbox
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700/50">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <LinkIcon size={14} className="text-indigo-400"/> URLs ({parsedData.payload.urls.length})
                          </h4>
                          <label className="flex items-center cursor-pointer group bg-slate-800/80 px-2 py-1 rounded border border-slate-700/50">
                            <span className="mr-2 text-slate-300 group-hover:text-white font-semibold text-[11px] uppercase tracking-wide transition-colors">Defang Links</span>
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={isDefanged} onChange={() => setIsDefanged(!isDefanged)} />
                              <div className={`block w-8 h-4 rounded-full transition-colors duration-300 border ${isDefanged ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600'}`}></div>
                              <div className={`dot absolute left-[2px] top-[2px] bg-white w-3 h-3 rounded-full transition-transform duration-300 shadow-sm ${isDefanged ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                        </div>
                        {parsedData.payload.urls.length === 0 ? (
                          <span className="text-sm italic text-slate-500">No URLs extracted from body.</span>
                        ) : (
                          <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {parsedData.payload.urls.map((url, i) => {
                              const displayUrl = isDefanged ? url.replace(/http/gi, 'hxxp').replace(/\./g, '[.]') : url;
                              return (
                                <li key={i} className="bg-[#0d1117] rounded-md p-3 text-xs font-mono text-rose-300 border border-slate-700/80 break-all flex flex-col gap-2 shadow-inner group">
                                  <span>{displayUrl}</span>
                                  <div className="flex items-center gap-2 self-end mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <CopyButton text={displayUrl} />
                                    <a href={`https://urlscan.io/search/#${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className="text-[11px] font-sans bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 px-2.5 py-1.5 rounded-md border border-indigo-500/40 transition-colors flex items-center font-semibold shadow-sm">
                                      <ExternalLink size={12} className="mr-1"/> urlscan.io
                                    </a>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                </div>

                {/* CTF Report Section */}
                <div className="lg:col-span-2" id="soc-report-content">
                  <SectionCard 
                    title="SOC L1 Investigation Report" 
                    icon={Target} 
                    className="border-blue-800/50 bg-blue-950/10 shadow-[0_0_30px_rgba(30,58,138,0.1)] relative overflow-hidden"
                    action={
                      <button onClick={exportReport} disabled={isExporting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg transition-colors disabled:opacity-50" data-html2canvas-ignore>
                        <Download size={14} /> {isExporting ? 'Exporting...' : 'Export PDF'}
                      </button>
                    }
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      
                      <div className="col-span-1 md:col-span-2 mt-2 mb-1 border-b border-slate-700/50 pb-2">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Mail size={16} className="text-blue-400"/> Phase 1: Header & Routing Analysis
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">1. Primary Recipient</span>
                          <div className="text-sm text-slate-200 font-mono truncate mt-1">{parsedData.basic.to}</div>
                        </div>
                        
                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">2. Sender (From)</span>
                          <div className="text-sm text-slate-200 font-mono truncate mt-1">{parsedData.basic.from}</div>
                        </div>

                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">3. Return-Path</span>
                          <div className="text-sm text-slate-400 font-mono truncate mt-1">{parsedData.network.returnPath}</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">4. Subject</span>
                          <div className="text-sm text-slate-200 font-medium truncate mt-1">{parsedData.basic.subject}</div>
                        </div>

                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">5. Date & Time (UTC)</span>
                          <div className="text-sm text-slate-200 font-mono truncate mt-1">{parsedData.basic.utcDate !== 'Unknown' ? parsedData.basic.utcDate : parsedData.basic.date}</div>
                        </div>

                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">6. Message-ID</span>
                          <div className="text-sm text-slate-400 font-mono truncate mt-1">{parsedData.basic.messageId}</div>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 mt-4 mb-1 border-b border-slate-700/50 pb-2">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Server size={16} className="text-rose-400"/> Phase 2: Infrastructure & Payload Analysis
                        </h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">7. Originating IP</span>
                          <div className="text-sm text-rose-300 font-mono font-bold truncate mt-1">{parsedData.network.originatingIp}</div>
                        </div>
                        
                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 shadow-inner transition-all focus-within:bg-blue-900/30 focus-within:border-blue-500/50 relative mt-2">
                          <span className="absolute -top-2.5 left-3 bg-blue-900 px-2 text-[10px] font-bold text-blue-200 uppercase tracking-wide border border-blue-700 rounded-sm">8. Resolved Host</span>
                          {parsedData.network.originatingIp !== 'Unknown' && (
                            <a href={`https://whois.domaintools.com/${parsedData.network.originatingIp}`} target="_blank" rel="noreferrer" className="absolute top-2 right-2 text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow-sm flex items-center gap-1 transition-colors">
                              <ExternalLink size={10} /> DomainTools
                            </a>
                          )}
                          <input 
                            type="text" 
                            value={ctfAnswers.reverseDns}
                            onChange={(e) => updateCtf('reverseDns', e.target.value)}
                            placeholder="Analyst Input Required..." 
                            className="w-full bg-slate-950/50 border border-slate-700/80 rounded p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono mt-1" 
                          />
                        </div>

                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">9. Authentication Status</span>
                          <div className="text-xs text-slate-300 font-mono flex gap-3 mt-2">
                            <span>SPF: <span className={parsedData.auth.spf === 'pass' ? 'text-emerald-400' : 'text-rose-400'}>{parsedData.auth.spf.toUpperCase()}</span></span>
                            <span>DKIM: <span className={parsedData.auth.dkim === 'pass' ? 'text-emerald-400' : 'text-rose-400'}>{parsedData.auth.dkim.toUpperCase()}</span></span>
                            <span>DMARC: <span className={parsedData.auth.dmarc === 'pass' ? 'text-emerald-400' : 'text-rose-400'}>{parsedData.auth.dmarc.toUpperCase()}</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">10. Attached File Name</span>
                          <div className="text-sm text-slate-200 font-mono truncate mt-1">
                            {parsedData.payload.attachments.length > 0 ? parsedData.payload.attachments.map(a => a.name).join(", ") : "None Detected"}
                          </div>
                        </div>

                        <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-700/60 shadow-sm relative">
                          <span className="absolute -top-2.5 left-3 bg-slate-800 px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-slate-700 rounded-sm">11. Primary Malicious URL</span>
                          <div className="text-sm text-rose-300 font-mono truncate mt-1">
                             {parsedData.payload.urls.length > 0 ? (isDefanged ? parsedData.payload.urls[0].replace(/http/gi, 'hxxp').replace(/\./g, '[.]') : parsedData.payload.urls[0]) : "None Detected"}
                          </div>
                        </div>

                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 shadow-inner transition-all focus-within:bg-blue-900/30 focus-within:border-blue-500/50 relative mt-2">
                          <span className="absolute -top-2.5 left-3 bg-blue-900 px-2 text-[10px] font-bold text-blue-200 uppercase tracking-wide border border-blue-700 rounded-sm">12. URL Hosting Service</span>
                          <input 
                            type="text" 
                            value={ctfAnswers.hostingService}
                            onChange={(e) => updateCtf('hostingService', e.target.value)}
                            placeholder="Analyst Input Required..." 
                            className="w-full bg-slate-950/50 border border-slate-700/80 rounded p-2.5 mt-1 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" 
                          />
                        </div>

                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 shadow-inner transition-all focus-within:bg-blue-900/30 focus-within:border-blue-500/50 relative mt-2">
                          <span className="absolute -top-2.5 left-3 bg-blue-900 px-2 text-[10px] font-bold text-blue-200 uppercase tracking-wide border border-blue-700 rounded-sm">13. Webpage Heading Text</span>
                          <input 
                            type="text" 
                            value={ctfAnswers.headingText}
                            onChange={(e) => updateCtf('headingText', e.target.value)}
                            placeholder="Analyst Input Required..." 
                            className="w-full bg-slate-950/50 border border-slate-700/80 rounded p-2.5 mt-1 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono" 
                          />
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 mt-4 mb-1 border-b border-slate-700/50 pb-2">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck size={16} className="text-emerald-400"/> Phase 3: Analyst Assessment
                        </h4>
                      </div>

                      <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 shadow-inner transition-all focus-within:bg-blue-900/30 focus-within:border-blue-500/50 relative mt-2">
                        <span className="absolute -top-2.5 left-3 bg-blue-900 px-2 text-[10px] font-bold text-blue-200 uppercase tracking-wide border border-blue-700 rounded-sm">14. Threat Classification</span>
                        <select 
                          value={ctfAnswers.threatType}
                          onChange={(e) => updateCtf('threatType', e.target.value)}
                          className="w-full bg-slate-950/50 border border-slate-700/80 rounded p-2.5 mt-1 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer" 
                        >
                          <option value="">Select Classification...</option>
                          <option value="Credential Harvesting">Credential Harvesting</option>
                          <option value="Malware Delivery">Malware Delivery</option>
                          <option value="Business Email Compromise (BEC)">Business Email Compromise (BEC)</option>
                          <option value="Spam / Unsolicited">Spam / Unsolicited</option>
                          <option value="False Positive (Legitimate)">False Positive (Legitimate)</option>
                        </select>
                      </div>

                      <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 shadow-inner transition-all focus-within:bg-blue-900/30 focus-within:border-blue-500/50 relative mt-2">
                        <span className="absolute -top-2.5 left-3 bg-blue-900 px-2 text-[10px] font-bold text-blue-200 uppercase tracking-wide border border-blue-700 rounded-sm">15. Recommended Remediation</span>
                        <select 
                          value={ctfAnswers.remediation}
                          onChange={(e) => updateCtf('remediation', e.target.value)}
                          className="w-full bg-slate-950/50 border border-slate-700/80 rounded p-2.5 mt-1 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer" 
                        >
                          <option value="">Select Action...</option>
                          <option value="Purge & Block Sender IP/Domain">Purge & Block Sender IP/Domain</option>
                          <option value="Quarantine & Monitor">Quarantine & Monitor</option>
                          <option value="Block URLs/Hashes on Proxy & EDR">Block URLs/Hashes on Proxy & EDR</option>
                          <option value="Ignore (No Action Required)">Ignore (No Action Required)</option>
                        </select>
                      </div>
                      
                    </div>
                  </SectionCard>
                </div>

                {/* HUNT QUERIES & IOC EXPORT — full width */}
                {intel && (
                  <div className="lg:col-span-2">
                    <SectionCard 
                      title="Hunt Queries & IOC Export" 
                      icon={Database}
                      className="border-indigo-900/40"
                      action={
                        <button 
                          onClick={() => downloadFile(currentExport, exportFilename, iocTab === 'stix' ? 'application/json' : 'text/plain')}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg transition-colors"
                        >
                          <Download size={14} /> Download
                        </button>
                      }
                    >
                      <div className="text-xs text-slate-400 mb-3 leading-relaxed">
                        Pre-built hunt queries derived from the extracted IOCs. KQL targets Microsoft 365 Defender / Sentinel Advanced Hunting; SPL targets Splunk with O365 / Sysmon sourcetypes. Schema substitutions for other SIEMs are documented inline at the top of each query block.
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-4 border-b border-slate-700/60 pb-3">
                        {[
                          { id: 'kql', label: 'KQL (Defender / Sentinel)', icon: Database },
                          { id: 'spl', label: 'SPL (Splunk)', icon: Database },
                          { id: 'csv', label: 'CSV (IOC Table)', icon: FileText },
                          { id: 'stix', label: 'STIX 2.1 Bundle', icon: FileJson }
                        ].map(t => {
                          const TabIcon = t.icon;
                          return (
                            <button 
                              key={t.id}
                              onClick={() => setIocTab(t.id)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${iocTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                            >
                              <TabIcon size={12} /> {t.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-[#0d1117] rounded-lg border border-slate-700/80 overflow-hidden shadow-inner relative">
                        <div className="absolute top-2 right-2 z-10">
                          <CopyButton text={currentExport} />
                        </div>
                        <pre className="p-4 pt-3 pr-20 overflow-auto h-[400px] custom-scrollbar terminal-scrollbar text-[12px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-words selection:bg-indigo-900/50">
                          {currentExport}
                        </pre>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        <div className="bg-slate-900/60 border border-slate-700/60 p-2.5 rounded text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">IPs</div>
                          <div className="text-lg font-bold text-blue-400">{parsedData.network.originatingIp !== 'Unknown' ? 1 : 0}</div>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-700/60 p-2.5 rounded text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Domains</div>
                          <div className="text-lg font-bold text-indigo-400">{parsedData.payload.domains.length}</div>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-700/60 p-2.5 rounded text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">URLs</div>
                          <div className="text-lg font-bold text-rose-400">{parsedData.payload.urls.length}</div>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-700/60 p-2.5 rounded text-center">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Files</div>
                          <div className="text-lg font-bold text-orange-400">{parsedData.payload.attachments.length}</div>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* Email Body Preview */}
                <div className="lg:col-span-2">
                  <SectionCard title="Sandboxed Email Body Preview" icon={Mail}>
                    <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3.5 mb-4 text-xs text-amber-200/80 flex items-start gap-3 shadow-inner">
                      <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5"/>
                      <p className="leading-relaxed">Rendered in a highly restricted iframe sandbox. JavaScript, popups, external form submissions, and top-navigation are strictly blocked. Remote images may still load (be aware of tracking pixels).</p>
                    </div>
                    {parsedData.payload.htmlBody ? (
                      <div className="bg-white rounded-lg border-2 border-slate-600 h-[600px] overflow-hidden shadow-inner flex flex-col">
                        <div className="bg-slate-200 border-b border-slate-300 p-2 flex items-center gap-2">
                          <div className="flex gap-1.5 ml-2">
                            <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                          </div>
                          <div className="ml-4 bg-white rounded-md px-3 py-1 text-[10px] font-mono text-slate-500 flex-1 border border-slate-300 shadow-sm text-center">
                            about:blank (Sandboxed)
                          </div>
                        </div>
                        <iframe 
                          title="Email Preview"
                          sandbox="" 
                          srcDoc={parsedData.payload.htmlBody}
                          className="w-full flex-1 bg-white"
                        />
                      </div>
                    ) : parsedData.payload.textBody ? (
                      <div className="bg-[#0d1117] rounded-lg p-5 h-[500px] overflow-y-auto whitespace-pre-wrap text-slate-300 font-mono text-sm border-2 border-slate-700 custom-scrollbar shadow-inner">
                        {parsedData.payload.textBody}
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 rounded-lg p-10 text-center text-slate-500 italic border-2 border-slate-800 border-dashed">
                        No readable HTML or Text body found in this file format.
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* Raw Source */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
                    <div className="border-b border-slate-700/60 bg-slate-800/80 flex items-center justify-between">
                      <div className="flex">
                        <button 
                          onClick={() => setRawViewMode('headers')}
                          className={`px-5 py-3.5 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${rawViewMode === 'headers' ? 'text-blue-400 border-blue-500 bg-slate-900' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'}`}
                        >
                          <FileJson size={16}/> Headers Only
                        </button>
                        <button 
                          onClick={() => setRawViewMode('full')}
                          className={`px-5 py-3.5 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${rawViewMode === 'full' ? 'text-blue-400 border-blue-500 bg-slate-900' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800'}`}
                        >
                          <Code size={16}/> Full Raw Source
                        </button>
                      </div>
                      <CopyButton text={rawViewMode === 'headers' ? parsedData.headers : parsedData.raw} className="mr-3 bg-slate-700 hover:bg-slate-600 border-slate-500" />
                    </div>
                    <div className="bg-[#0d1117] p-5 overflow-auto h-[450px] terminal-scrollbar custom-scrollbar shadow-inner relative">
                      <pre className="text-[#56d364] font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all selection:bg-emerald-900/50">
                        {rawViewMode === 'headers' ? parsedData.headers : parsedData.raw}
                      </pre>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>
        {sandboxAttachment && (
          <SandboxModal 
            attachment={sandboxAttachment} 
            onClose={() => setSandboxAttachment(null)} 
          />
        )}
      </div>
    </div>
  );
}