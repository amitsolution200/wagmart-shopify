const fs = require('node:fs');
const path = require('node:path');

function renderContactPageHtml() {
  const liquidPath = path.resolve(__dirname, '..', 'sections', 'main-contact.liquid');
  let liquidContent = '';
  if (fs.existsSync(liquidPath)) {
    liquidContent = fs.readFileSync(liquidPath, 'utf8');
  }

  // Extract CSS, HTML, and JS from main-contact.liquid, stripping Liquid template tags for standalone rendering
  const styleMatch = liquidContent.match(/<style>([\s\S]*?)<\/style>/);
  const styles = styleMatch ? styleMatch[1] : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Wagmart | Dedicated Pet Care Support</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${styles}
    /* Standalone shell styles */
    header.wm-nav-shell {
      background: #FFFFFF;
      border-bottom: 1px solid #E5E7EB;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .wm-nav-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 900;
      font-size: 22px;
      color: #111827;
      text-decoration: none;
    }
    .wm-nav-logo span {
      background: #7A46E5;
      color: #fff;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .wm-nav-links {
      display: flex;
      gap: 20px;
      font-size: 14px;
      font-weight: 700;
    }
    .wm-nav-links a { color: #4B5563; text-decoration: none; }
    .wm-nav-links a:hover { color: #7A46E5; }
    .wm-nav-admin {
      background: #EDE9FE;
      color: #7A46E5 !important;
      padding: 6px 14px;
      border-radius: 999px;
    }
  </style>
</head>
<body>

  <header class="wm-nav-shell">
    <a href="/" class="wm-nav-logo">
      <span>W</span> Wagmart
    </a>
    <nav class="wm-nav-links">
      <a href="/pages/contact">Contact Us</a>
      <a href="/admin/inquiries" class="wm-nav-admin">Staff Dashboard →</a>
    </nav>
  </header>

  <div class="wagmart-contact-page">

    <!-- 1. HERO SECTION -->
    <section class="wagmart-hero">
      <div class="wagmart-contact-container">
        <div style="margin-bottom: 8px;">
          <span style="background: #F3F4F6; color: #4B5563; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
            Dedicated Pet Care Support
          </span>
        </div>
        <h1 class="wagmart-font-display wagmart-hero-title">
          Get in Touch
        </h1>
        <div class="wagmart-hero-image-box">
          <div style="background: linear-gradient(135deg, #7A46E5 0%, #4C1D95 100%); aspect-ratio: 16/7; display: flex; align-items: center; justify-content: center; color: white;">
            <div style="text-align: center; padding: 20px;">
              <h2 style="font-size: clamp(24px, 3.5vw, 42px); font-weight: 800; margin-bottom: 8px;">We're Here For You and Your Pets</h2>
              <p style="font-size: 16px; opacity: 0.9; max-width: 600px; margin: 0 auto;">Expert guidance on pet nutrition, sizing, order tracking, and returns.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. CREAM CONTAINER SECTION (#F5F2EF) -->
    <section class="wagmart-cream-section">
      <div class="wagmart-contact-container">
        <div class="wagmart-cream-card">
          <span style="background: #FFFFFF; color: #4B5563; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            Get in Touch
          </span>
          <h2 class="wagmart-font-display wagmart-cream-title">
            Have questions or need help with your pet? Reach out to us today.
          </h2>

          <div class="wagmart-split-grid">
            
            <!-- Left Form Card -->
            <div class="wagmart-form-card">
              <form id="WagmartContactForm" method="post" action="/contact#contact_form">
                
                <!-- Anti-spam honeypot (hidden from human visitors) -->
                <div style="position: absolute; left: -9999px; top: -9999px; opacity: 0; pointer-events: none;" aria-hidden="true">
                  <input type="text" name="contact[hp_website]" id="WagmartFormHp" tabindex="-1" autocomplete="off">
                </div>

                <!-- Row 1: Name and Email -->
                <div class="wagmart-field-row">
                  <div class="wagmart-field">
                    <label for="WagmartFormName" class="wagmart-input-label">Your Name <span style="color: #EF4444;">*</span></label>
                    <input type="text" id="WagmartFormName" name="contact[name]" placeholder="e.g. Sarah Jenkins" required class="wagmart-input">
                  </div>
                  <div class="wagmart-field">
                    <label for="WagmartFormEmail" class="wagmart-input-label">Email Address <span style="color: #EF4444;">*</span></label>
                    <input type="email" id="WagmartFormEmail" name="contact[email]" placeholder="sarah@example.com" required class="wagmart-input">
                  </div>
                </div>

                <!-- Row 2: Order Number and Topic -->
                <div class="wagmart-field-row">
                  <div class="wagmart-field">
                    <label for="WagmartFormOrder" class="wagmart-input-label">Order Number <span style="font-weight: 400; color: #8C827A;">(Optional)</span></label>
                    <input type="text" id="WagmartFormOrder" name="contact[order_number]" placeholder="e.g. #WM-10492" class="wagmart-input">
                  </div>
                  <div class="wagmart-field">
                    <label for="WagmartFormTopic" class="wagmart-input-label">Inquiry Topic <span style="color: #EF4444;">*</span></label>
                    <div class="wagmart-select-wrap">
                      <select id="WagmartFormTopic" name="contact[Topic]" required class="wagmart-input wagmart-select">
                        <option value="" disabled selected>Select an inquiry topic...</option>
                        <option value="Product Advice & Sizing">Product Advice & Sizing</option>
                        <option value="Order Tracking & Shipping">Order Tracking & Shipping</option>
                        <option value="Returns & Exchanges">Returns & Exchanges</option>
                        <option value="Grooming & Hygiene Care">Grooming & Hygiene Care</option>
                        <option value="Other Inquiries">Other Inquiries</option>
                      </select>
                      <div class="wagmart-select-arrow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Row 3: Message -->
                <div class="wagmart-field">
                  <label for="WagmartFormMessage" class="wagmart-input-label">Message <span style="color: #EF4444;">*</span></label>
                  <textarea id="WagmartFormMessage" name="contact[body]" rows="6" placeholder="How can we help you and your pet today? Include any helpful sizing or order details..." required class="wagmart-input wagmart-textarea"></textarea>
                </div>

                <!-- Submit Button -->
                <button type="submit" id="WagmartFormSubmit" class="wagmart-submit-btn">
                  <span>Send Message</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </button>

                <!-- On-Page Alert -->
                <div id="WagmartFormAlert" class="wagmart-form-alert" style="display: none; margin-top: 16px; padding: 14px 16px; border-radius: 8px; font-size: 13.5px; line-height: 1.5;" role="status" aria-live="polite"></div>

              </form>
            </div>

            <!-- Right Info Column -->
            <div class="wagmart-info-col">
              <div class="wagmart-info-list">
                
                <div class="wagmart-info-item">
                  <div class="wagmart-info-icon-box">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div class="wagmart-info-content">
                    <h4 class="wagmart-font-display wagmart-info-title">Store Address:</h4>
                    <p class="wagmart-info-text">
                      Shop No. 312, 3rd Floor, Shivalik Complex,<br>
                      Katargam, Surat, Gujarat, 395004
                    </p>
                  </div>
                </div>

                <div class="wagmart-info-item">
                  <div class="wagmart-info-icon-box">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div class="wagmart-info-content">
                    <h4 class="wagmart-font-display wagmart-info-title">Phone Support:</h4>
                    <div class="wagmart-info-text">
                      <a href="tel:+917777985896" class="wagmart-info-link">+91 77779 85896</a>
                      <span style="font-size: 13px; color: #6B7280; display: block;">Mon – Sat: 9:00 AM – 7:00 PM IST</span>
                    </div>
                  </div>
                </div>

                <div class="wagmart-info-item">
                  <div class="wagmart-info-icon-box">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <div class="wagmart-info-content">
                    <h4 class="wagmart-font-display wagmart-info-title">Email:</h4>
                    <div class="wagmart-info-text">
                      <a href="mailto:support@wagmart.com" class="wagmart-info-link">support@wagmart.com</a>
                      <span style="font-size: 13px; color: #6B7280; display: block;">Typical response: Under 24 hours</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

  </div>

  <!-- Toast Notification -->
  <div class="wm-toast" id="wm-contact-toast" role="status" aria-live="polite">
    <svg class="wm-toast__icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
    <span class="wm-toast__msg" id="wm-contact-toast-msg">Thank you! Your message has been sent.</span>
    <button type="button" class="wm-toast__close" id="wm-contact-toast-close" aria-label="Close notification">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  </div>

  <script>
    (function() {
      function initContactForm() {
        var form = document.getElementById('WagmartContactForm');
        var toast = document.getElementById('wm-contact-toast');
        var toastClose = document.getElementById('wm-contact-toast-close');
        var toastMsg = document.getElementById('wm-contact-toast-msg');
        var submitBtn = document.getElementById('WagmartFormSubmit');
        var alertBox = document.getElementById('WagmartFormAlert');
        var toastTimer = null;

        if (!form || !toast) return;

        function showToast(message, isError) {
          if (message && toastMsg) toastMsg.textContent = message;
          if (isError) {
            toast.style.backgroundColor = '#991B1B';
          } else {
            toast.style.backgroundColor = '#1F2937';
          }
          toast.classList.add('is-visible');

          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = setTimeout(function() {
            hideToast();
          }, 6000);
        }

        function hideToast() {
          if (toast) toast.classList.remove('is-visible');
          if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
          }
        }

        function showAlert(type, title, message) {
          if (!alertBox) return;
          var isSuccess = type === 'success';
          alertBox.style.display = 'block';
          alertBox.style.backgroundColor = isSuccess ? '#ECFDF5' : '#FEF2F2';
          alertBox.style.border = isSuccess ? '1px solid #A7F3D0' : '1px solid #FECACA';
          alertBox.style.color = isSuccess ? '#065F46' : '#991B1B';
          alertBox.innerHTML = '<strong>' + escapeHtml(title) + '</strong><div style="margin-top: 4px;">' + message + '</div>';
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function hideAlert() {
          if (alertBox) alertBox.style.display = 'none';
        }

        function escapeHtml(str) {
          if (!str) return '';
          var div = document.createElement('div');
          div.textContent = str;
          return div.innerHTML;
        }

        if (toastClose) {
          toastClose.addEventListener('click', hideToast);
        }

        form.addEventListener('submit', function(e) {
          e.preventDefault();
          hideAlert();

          var nameInput = document.getElementById('WagmartFormName');
          var emailInput = document.getElementById('WagmartFormEmail');
          var orderInput = document.getElementById('WagmartFormOrder');
          var topicInput = document.getElementById('WagmartFormTopic');
          var msgInput = document.getElementById('WagmartFormMessage');
          var hpInput = document.getElementById('WagmartFormHp');

          var nameVal = nameInput ? nameInput.value.trim() : '';
          var emailVal = emailInput ? emailInput.value.trim() : '';
          var orderVal = orderInput ? orderInput.value.trim() : '';
          var topicVal = topicInput ? topicInput.value.trim() : '';
          var msgVal = msgInput ? msgInput.value.trim() : '';
          var hpVal = hpInput ? hpInput.value.trim() : '';

          if (hpVal) {
            showAlert('error', 'Submission Rejected', 'Automated submission detected.');
            return;
          }

          if (!nameVal || !emailVal || !topicVal || !msgVal) {
            if (typeof form.reportValidity === 'function') form.reportValidity();
            return;
          }

          var originalBtnContent = submitBtn ? submitBtn.innerHTML : '';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="wm-btn-spinner" aria-hidden="true"></span> <span>Saving Inquiry...</span>';
          }

          var backendUrl = window.WAGMART_API_BASE_URL || '/api/contact';

          var payload = {
            name: nameVal,
            email: emailVal,
            order_number: orderVal,
            topic: topicVal,
            message: msgVal,
            hp_website: hpVal
          };

          fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          })
          .then(function(res) {
            return res.json().then(function(data) {
              return { status: res.status, ok: res.ok, data: data };
            }).catch(function() {
              return { status: res.status, ok: res.ok, data: null };
            });
          })
          .then(function(result) {
            if (result.ok && result.data && result.data.success) {
              var ref = result.data.reference;
              var successMsg = 'Thank you! Your message has been saved under reference #' + ref + '.';
              showToast(successMsg, false);
              showAlert('success', 'Inquiry Received (Ref #' + ref + ')',
                'Thank you, <strong>' + escapeHtml(nameVal) + '</strong>. Your inquiry has been securely recorded. Our team will review your message and reply via email within 24 hours.'
              );

              form.reset();

              if (submitBtn) {
                submitBtn.innerHTML = '<span>Message Received ✓</span>';
                setTimeout(function() {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = originalBtnContent;
                }, 4000);
              }
            } else {
              var errorMsg = (result.data && result.data.error) ? result.data.error : 'Unable to submit your inquiry. Please check your details and try again.';
              if (result.data && result.data.errors) {
                var fieldErrors = Object.values(result.data.errors).join('<br>');
                errorMsg += '<br><small>' + fieldErrors + '</small>';
              }
              showToast('Submission error. Please check form.', true);
              showAlert('error', 'Unable to Send Message', errorMsg);

              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
              }
            }
          })
          .catch(function(networkErr) {
            showToast('Connection issue. Please retry.', true);
            showAlert('error', 'Connection Error',
              'Could not connect to the inquiry service. Please check your connection or reach our support team directly at +91 77779 85896.'
            );

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnContent;
            }
          });
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContactForm);
      } else {
        initContactForm();
      }
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  renderContactPageHtml,
};
