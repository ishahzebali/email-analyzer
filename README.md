# 🛡️ SOC L1 Auto-Triage & Email Analyzer

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Privacy](https://img.shields.io/badge/100%25_Client--Side-Secure-success?style=for-the-badge)

The **SOC L1 Auto-Triage Tool** is a lightweight, browser-based utility designed for Blue Team analysts, Security Operations Centers (SOC), and Cybersecurity CTF players. 

It allows analysts to drag-and-drop raw `.eml` or `.txt` email files and instantly extracts critical forensic metadata, network infrastructure paths, and malicious payloads—**without ever sending the file to a remote server**.

## ✨ Key Features

*   🔒 **Zero-Trust Privacy:** 100% client-side parsing. Your malicious `.eml` files never leave your browser, ensuring strict adherence to data privacy and OPSEC.
*   🛤️ **Advanced Routing Hop Tracing:** Reconstructs the email's chronological path by parsing `Received:` headers, exposing the true Originating IP and internal server hops.
*   🛡️ **Spoofing Detection:** Automatically analyzes SPF, DKIM, and DMARC authentication headers, and flags mismatches between the `From` address and the `Return-Path`.
*   📦 **Payload Extraction & Defanging:** Safely extracts attachment names and web URLs. Features a 1-click URL defanger (e.g., `hxxp://malicious[.]com`) and integration with URL2PNG for safe screenshotting.
*   🖼️ **Sandboxed Visual Preview:** Renders the email's HTML body inside a strictly restricted `iframe sandbox`, blocking JavaScript execution, popups, and tracking pixels while allowing the analyst to see the social engineering lure.
*   📝 **Interactive Investigation Report:** Built-in 15-point Analyst Playbook. Analysts can answer manual investigation questions (Reverse DNS, Threat Type, Remediation) and export a formatted `.txt` brief ready for ticketing systems (Jira, ServiceNow, etc.).

## 🚀 Getting Started

This application is built as a single-page React app using Tailwind CSS for styling.

### Prerequisites
* Node.js and npm installed.

### Installation

1. Clone the repository:
   
```bash
   git clone https://github.com/ishahzebali/email-analyzer.git
   cd email-analyzer
```
