/**
 * RS Neuro & Health Care — Unified Supabase Client & Security Engine
 * Supports Live Supabase Project & Zero-Config High-Fidelity Local Sandbox Mode
 */

(function (window) {
  'use strict';

  // 1. PUBLIC CLIENT CONFIGURATION
  // Replace these placeholders with your live Supabase project credentials when available.
  const SUPABASE_CONFIG = {
    url: window.RS_SUPABASE_URL || 'https://mock-rs-neuro-care.supabase.co',
    anonKey: window.RS_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key',
    isLiveConfigured: function () {
      return (
        this.url &&
        !this.url.includes('mock-') &&
        this.anonKey &&
        !this.anonKey.includes('mock-') &&
        typeof window.supabase !== 'undefined'
      );
    }
  };

  // 2. XSS SANITIZATION UTILITY
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 3. LOCAL SANDBOX STORE (Zero-config local persistence for instant Live Preview testing)
  const STORAGE_KEY_AUTH = 'rs_auth_session';
  const STORAGE_KEY_USERS = 'rs_db_users';
  const STORAGE_KEY_COURSES = 'rs_db_courses';
  const STORAGE_KEY_ENROLLMENTS = 'rs_db_enrollments';
  const STORAGE_KEY_TICKETS = 'rs_db_tickets';
  const STORAGE_KEY_MESSAGES = 'rs_db_messages';
  const STORAGE_KEY_AUDIT = 'rs_db_audit';

  // Seed default sandbox data if not present
  function initSandboxData() {
    if (!localStorage.getItem(STORAGE_KEY_USERS)) {
      const defaultUsers = [
        {
          id: 'usr-admin-001',
          email: 'admin@rsneurocare.com',
          password: 'Password@123',
          full_name: 'Dr. R. K. Gupta (Admin)',
          phone: '08797459791',
          role: 'admin',
          status: 'active',
          created_at: new Date(Date.now() - 30 * 86400000).toISOString()
        },
        {
          id: 'usr-student-001',
          email: 'student@rsneurocare.com',
          password: 'Password@123',
          full_name: 'Rahul Sharma',
          phone: '9876543210',
          role: 'user',
          status: 'active',
          created_at: new Date(Date.now() - 10 * 86400000).toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem(STORAGE_KEY_COURSES)) {
      const defaultCourses = [
        {
          id: 'crs-001',
          title: 'Diploma in Neuro-Rehabilitation',
          slug: 'diploma-in-neuro-rehabilitation',
          description: 'For physiotherapists & nurses — advanced neuro care techniques, stroke recovery, and clinical motor rehabilitation.',
          duration: '12 months',
          eligibility: 'BPT / MPT / GNM / B.Sc Nursing',
          fee: 25000,
          status: 'published',
          icon: '📘',
          created_at: new Date(Date.now() - 60 * 86400000).toISOString()
        },
        {
          id: 'crs-002',
          title: 'Certificate in Spine Care',
          slug: 'certificate-in-spine-care',
          description: 'Hands-on chiropractic, spinal decompression, postural analysis, and vertebral adjustment training.',
          duration: '6 months',
          eligibility: 'Physiotherapists & Medical Graduates',
          fee: 15000,
          status: 'published',
          icon: '🧠',
          created_at: new Date(Date.now() - 60 * 86400000).toISOString()
        },
        {
          id: 'crs-003',
          title: 'Pain Management Workshop',
          slug: 'pain-management-workshop',
          description: 'Latest non-surgical interventions for chronic pain, sciatica, and trigger point therapy.',
          duration: '3 days',
          eligibility: 'Medical Practitioners & Rehab Specialists',
          fee: 5000,
          status: 'published',
          icon: '💊',
          created_at: new Date(Date.now() - 60 * 86400000).toISOString()
        },
        {
          id: 'crs-004',
          title: 'Patient Education Program',
          slug: 'patient-education-program',
          description: 'Community-driven preventive care sessions: learn about neuropathy, back pain, and spinal ergonomics.',
          duration: 'Monthly',
          eligibility: 'Open to all patients & families',
          fee: 0,
          status: 'published',
          icon: '🧑‍🏫',
          created_at: new Date(Date.now() - 60 * 86400000).toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(defaultCourses));
    }

    if (!localStorage.getItem(STORAGE_KEY_ENROLLMENTS)) {
      const defaultEnrollments = [
        {
          id: 'enr-001',
          user_id: 'usr-student-001',
          course_id: 'crs-001',
          status: 'approved',
          enrollment_date: new Date(Date.now() - 7 * 86400000).toISOString(),
          notes: 'Admission confirmed. Batch starts next month.'
        },
        {
          id: 'enr-002',
          user_id: 'usr-student-001',
          course_id: 'crs-002',
          status: 'pending',
          enrollment_date: new Date(Date.now() - 1 * 86400000).toISOString(),
          notes: 'Counseling session pending.'
        }
      ];
      localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(defaultEnrollments));
    }

    if (!localStorage.getItem(STORAGE_KEY_TICKETS)) {
      const defaultTickets = [
        {
          id: 'tkt-001',
          user_id: 'usr-student-001',
          subject: 'Batch timings for Neuro-Rehab Diploma',
          category: 'admission',
          priority: 'medium',
          status: 'in_progress',
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 86400000).toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(defaultTickets));
    }

    if (!localStorage.getItem(STORAGE_KEY_MESSAGES)) {
      const defaultMessages = [
        {
          id: 'msg-001',
          ticket_id: 'tkt-001',
          sender_id: 'usr-student-001',
          message: 'Hello, I wanted to confirm if the hybrid practical classes are on weekends or weekdays?',
          created_at: new Date(Date.now() - 3 * 86400000).toISOString()
        },
        {
          id: 'msg-002',
          ticket_id: 'tkt-001',
          sender_id: 'usr-admin-001',
          message: 'Namaste Rahul, practical sessions at the Bettiah centre are conducted on Saturday and Sunday afternoons.',
          created_at: new Date(Date.now() - 1 * 86400000).toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(defaultMessages));
    }

    if (!localStorage.getItem(STORAGE_KEY_AUDIT)) {
      const defaultAudit = [
        {
          id: 'aud-001',
          actor_id: 'usr-admin-001',
          actor_name: 'Dr. R. K. Gupta',
          action: 'System Initialized',
          entity_type: 'System',
          entity_id: 'GLOBAL',
          created_at: new Date(Date.now() - 15 * 86400000).toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(defaultAudit));
    }
  }

  initSandboxData();

  // Helper getters/setters for sandbox
  function getCollection(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }
  function setCollection(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // 4. MAIN ENGINE EXPORTS
  const RSApp = {
    escapeHTML: escapeHTML,

    // --- AUTHENTICATION ---
    getCurrentSession: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_AUTH);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    getCurrentUser: function () {
      const session = this.getCurrentSession();
      return session ? session.user : null;
    },

    signIn: async function (email, password) {
      email = email.trim().toLowerCase();
      // Sandbox implementation
      const users = getCollection(STORAGE_KEY_USERS);
      const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

      if (!user) {
        return { data: null, error: { message: 'Invalid email or password.' } };
      }
      if (user.status === 'suspended') {
        return { data: null, error: { message: 'This account is suspended. Please contact administration.' } };
      }

      const session = {
        access_token: 'sandbox-jwt-' + Math.random().toString(36).substring(2),
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role,
          status: user.status
        }
      };

      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
      this.recordAudit(user.id, 'User Login', 'Auth', user.id, { role: user.role });
      return { data: session, error: null };
    },

    signUp: async function (fullName, email, phone, password) {
      email = email.trim().toLowerCase();
      const users = getCollection(STORAGE_KEY_USERS);

      if (users.some(u => u.email.toLowerCase() === email)) {
        return { data: null, error: { message: 'An account with this email already exists.' } };
      }

      const newUser = {
        id: 'usr-' + Date.now().toString(36),
        email: email,
        password: password,
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : '',
        role: 'user', // Default role always user (prevent self-elevation)
        status: 'active',
        created_at: new Date().toISOString()
      };

      users.push(newUser);
      setCollection(STORAGE_KEY_USERS, users);

      const session = {
        access_token: 'sandbox-jwt-' + Math.random().toString(36).substring(2),
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status
        }
      };

      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
      this.recordAudit(newUser.id, 'Account Registration', 'Auth', newUser.id, { email: newUser.email });
      return { data: session, error: null };
    },

    signOut: async function () {
      const user = this.getCurrentUser();
      if (user) {
        this.recordAudit(user.id, 'User Logout', 'Auth', user.id);
      }
      localStorage.removeItem(STORAGE_KEY_AUTH);
      return { error: null };
    },

    updateProfile: async function (userId, updateData) {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { error: { message: 'Not authenticated' } };

      // RLS Check: Only self or admin can update
      if (currentUser.id !== userId && currentUser.role !== 'admin') {
        return { error: { message: 'Access Denied: Row Level Security Policy Violation' } };
      }

      const users = getCollection(STORAGE_KEY_USERS);
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) return { error: { message: 'User not found' } };

      // Prevent non-admins from changing roles or account status
      if (currentUser.role !== 'admin') {
        delete updateData.role;
        delete updateData.status;
      }

      users[idx] = { ...users[idx], ...updateData, updated_at: new Date().toISOString() };
      setCollection(STORAGE_KEY_USERS, users);

      // Update current session if self
      if (currentUser.id === userId) {
        const session = this.getCurrentSession();
        session.user = {
          ...session.user,
          full_name: users[idx].full_name,
          phone: users[idx].phone,
          role: users[idx].role,
          status: users[idx].status
        };
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
      }

      this.recordAudit(currentUser.id, 'Update Profile', 'User', userId, updateData);
      return { data: users[idx], error: null };
    },

    changePassword: async function (oldPassword, newPassword) {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { error: { message: 'Not authenticated' } };

      const users = getCollection(STORAGE_KEY_USERS);
      const user = users.find(u => u.id === currentUser.id);
      if (!user) return { error: { message: 'User not found' } };

      if (user.password !== oldPassword) {
        return { error: { message: 'Current password is incorrect.' } };
      }

      user.password = newPassword;
      setCollection(STORAGE_KEY_USERS, users);
      this.recordAudit(currentUser.id, 'Password Changed', 'Auth', currentUser.id);
      return { data: { success: true }, error: null };
    },

    // --- COURSES ---
    getCourses: async function () {
      const courses = getCollection(STORAGE_KEY_COURSES);
      const user = this.getCurrentUser();
      // Unauthenticated / regular users only see published courses
      if (!user || user.role !== 'admin') {
        return { data: courses.filter(c => c.status === 'published'), error: null };
      }
      return { data: courses, error: null };
    },

    saveCourse: async function (courseData) {
      const user = this.getCurrentUser();
      if (!user || user.role !== 'admin') {
        return { error: { message: 'Access Denied: Admin authorization required' } };
      }

      const courses = getCollection(STORAGE_KEY_COURSES);
      if (courseData.id) {
        const idx = courses.findIndex(c => c.id === courseData.id);
        if (idx !== -1) {
          courses[idx] = { ...courses[idx], ...courseData, updated_at: new Date().toISOString() };
          setCollection(STORAGE_KEY_COURSES, courses);
          this.recordAudit(user.id, 'Course Updated', 'Course', courseData.id, { title: courseData.title });
          return { data: courses[idx], error: null };
        }
      }

      const newCourse = {
        id: 'crs-' + Date.now().toString(36),
        slug: courseData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        created_at: new Date().toISOString(),
        ...courseData
      };
      courses.push(newCourse);
      setCollection(STORAGE_KEY_COURSES, courses);
      this.recordAudit(user.id, 'Course Created', 'Course', newCourse.id, { title: newCourse.title });
      return { data: newCourse, error: null };
    },

    // --- ENROLLMENTS ---
    getEnrollments: async function () {
      const user = this.getCurrentUser();
      if (!user) return { error: { message: 'Not authenticated' } };

      const enrollments = getCollection(STORAGE_KEY_ENROLLMENTS);
      const courses = getCollection(STORAGE_KEY_COURSES);
      const users = getCollection(STORAGE_KEY_USERS);

      const enriched = enrollments.map(e => ({
        ...e,
        course: courses.find(c => c.id === e.course_id) || { title: 'Unknown Course' },
        user: users.find(u => u.id === e.user_id) || { full_name: 'Unknown User', email: '' }
      }));

      if (user.role === 'admin') {
        return { data: enriched, error: null };
      }
      // RLS Policy: User only sees their own enrollments
      return { data: enriched.filter(e => e.user_id === user.id), error: null };
    },

    createEnrollment: async function (courseId, notes) {
      const user = this.getCurrentUser();
      if (!user) return { error: { message: 'Please login to submit an enrollment request.' } };

      const enrollments = getCollection(STORAGE_KEY_ENROLLMENTS);
      // Check existing
      if (enrollments.some(e => e.user_id === user.id && e.course_id === courseId)) {
        return { error: { message: 'You have already applied for this course.' } };
      }

      const newEnrollment = {
        id: 'enr-' + Date.now().toString(36),
        user_id: user.id,
        course_id: courseId,
        status: 'pending',
        enrollment_date: new Date().toISOString(),
        notes: notes || 'Online application submitted.',
        created_at: new Date().toISOString()
      };

      enrollments.push(newEnrollment);
      setCollection(STORAGE_KEY_ENROLLMENTS, enrollments);
      this.recordAudit(user.id, 'Course Enrollment Submitted', 'Enrollment', newEnrollment.id, { course_id: courseId });
      return { data: newEnrollment, error: null };
    },

    updateEnrollmentStatus: async function (enrollmentId, status, notes) {
      const user = this.getCurrentUser();
      if (!user || user.role !== 'admin') {
        return { error: { message: 'Access Denied: Admin authorization required' } };
      }

      const enrollments = getCollection(STORAGE_KEY_ENROLLMENTS);
      const idx = enrollments.findIndex(e => e.id === enrollmentId);
      if (idx === -1) return { error: { message: 'Enrollment not found' } };

      enrollments[idx].status = status;
      if (notes) enrollments[idx].notes = notes;
      enrollments[idx].updated_at = new Date().toISOString();

      setCollection(STORAGE_KEY_ENROLLMENTS, enrollments);
      this.recordAudit(user.id, 'Enrollment Status Updated', 'Enrollment', enrollmentId, { status: status, notes: notes });
      return { data: enrollments[idx], error: null };
    },

    // --- SUPPORT TICKETS & MESSAGES ---
    getTickets: async function () {
      const user = this.getCurrentUser();
      if (!user) return { error: { message: 'Not authenticated' } };

      const tickets = getCollection(STORAGE_KEY_TICKETS);
      const users = getCollection(STORAGE_KEY_USERS);

      const enriched = tickets.map(t => ({
        ...t,
        user: users.find(u => u.id === t.user_id) || { full_name: 'Unknown User', email: '' }
      }));

      if (user.role === 'admin') {
        return { data: enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), error: null };
      }
      return { data: enriched.filter(t => t.user_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), error: null };
    },

    createTicket: async function (subject, category, priority, initialMessage) {
      const user = this.getCurrentUser();
      if (!user) return { error: { message: 'Please login to submit a support ticket.' } };

      const tickets = getCollection(STORAGE_KEY_TICKETS);
      const messages = getCollection(STORAGE_KEY_MESSAGES);

      const ticketId = 'tkt-' + Date.now().toString(36);
      const newTicket = {
        id: ticketId,
        user_id: user.id,
        subject: subject.trim(),
        category: category || 'general',
        priority: priority || 'medium',
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      tickets.push(newTicket);
      setCollection(STORAGE_KEY_TICKETS, tickets);

      if (initialMessage && initialMessage.trim()) {
        const newMsg = {
          id: 'msg-' + Date.now().toString(36),
          ticket_id: ticketId,
          sender_id: user.id,
          message: initialMessage.trim(),
          created_at: new Date().toISOString()
        };
        messages.push(newMsg);
        setCollection(STORAGE_KEY_MESSAGES, messages);
      }

      this.recordAudit(user.id, 'Support Ticket Created', 'SupportTicket', ticketId, { subject: subject });
      return { data: newTicket, error: null };
    },

    getTicketMessages: async function (ticketId) {
      const user = this.getCurrentUser();
      if (!user) return { error: { message: 'Not authenticated' } };

      const tickets = getCollection(STORAGE_KEY_TICKETS);
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return { error: { message: 'Ticket not found' } };

      // RLS Check: Only owner or admin can view ticket messages
      if (ticket.user_id !== user.id && user.role !== 'admin') {
        return { error: { message: 'Access Denied: Cannot view another user\'s support ticket' } };
      }

      const messages = getCollection(STORAGE_KEY_MESSAGES);
      const users = getCollection(STORAGE_KEY_USERS);

      const ticketMessages = messages
        .filter(m => m.ticket_id === ticketId)
        .map(m => ({
          ...m,
          sender: users.find(u => u.id === m.sender_id) || { full_name: 'Unknown', role: 'user' }
        }))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      return { data: { ticket: ticket, messages: ticketMessages }, error: null };
    },

    replyTicket: async function (ticketId, messageText) {
      const user = this.getCurrentUser();
      if (!user) return { error: { message: 'Not authenticated' } };

      const tickets = getCollection(STORAGE_KEY_TICKETS);
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) return { error: { message: 'Ticket not found' } };

      // RLS Check
      if (ticket.user_id !== user.id && user.role !== 'admin') {
        return { error: { message: 'Access Denied: Cannot reply to another user\'s ticket' } };
      }

      const messages = getCollection(STORAGE_KEY_MESSAGES);
      const newMsg = {
        id: 'msg-' + Date.now().toString(36),
        ticket_id: ticketId,
        sender_id: user.id,
        message: messageText.trim(),
        created_at: new Date().toISOString()
      };
      messages.push(newMsg);
      setCollection(STORAGE_KEY_MESSAGES, messages);

      // Update ticket status
      if (user.role === 'admin') {
        ticket.status = 'waiting_user';
      } else {
        ticket.status = 'in_progress';
      }
      ticket.updated_at = new Date().toISOString();
      setCollection(STORAGE_KEY_TICKETS, tickets);

      this.recordAudit(user.id, 'Ticket Reply Sent', 'SupportTicket', ticketId);
      return { data: newMsg, error: null };
    },

    updateTicketStatus: async function (ticketId, status, priority) {
      const user = this.getCurrentUser();
      if (!user || user.role !== 'admin') {
        return { error: { message: 'Access Denied: Admin role required' } };
      }

      const tickets = getCollection(STORAGE_KEY_TICKETS);
      const idx = tickets.findIndex(t => t.id === ticketId);
      if (idx === -1) return { error: { message: 'Ticket not found' } };

      if (status) tickets[idx].status = status;
      if (priority) tickets[idx].priority = priority;
      tickets[idx].updated_at = new Date().toISOString();

      setCollection(STORAGE_KEY_TICKETS, tickets);
      this.recordAudit(user.id, 'Ticket Status Updated', 'SupportTicket', ticketId, { status, priority });
      return { data: tickets[idx], error: null };
    },

    // --- USERS (ADMIN) ---
    getUsers: async function () {
      const user = this.getCurrentUser();
      if (!user || user.role !== 'admin') {
        return { error: { message: 'Access Denied: Admin authorization required' } };
      }
      const users = getCollection(STORAGE_KEY_USERS).map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        phone: u.phone,
        role: u.role,
        status: u.status,
        created_at: u.created_at
      }));
      return { data: users, error: null };
    },

    // --- AUDIT LOGS ---
    recordAudit: function (actorId, action, entityType, entityId, metadata) {
      try {
        const audit = getCollection(STORAGE_KEY_AUDIT);
        const users = getCollection(STORAGE_KEY_USERS);
        const actor = users.find(u => u.id === actorId);

        const newLog = {
          id: 'aud-' + Date.now().toString(36),
          actor_id: actorId,
          actor_name: actor ? actor.full_name : 'System/Anonymous',
          action: action,
          entity_type: entityType,
          entity_id: entityId || '',
          metadata: metadata || {},
          created_at: new Date().toISOString()
        };
        audit.unshift(newLog); // Prepend for latest first
        if (audit.length > 500) audit.length = 500; // Cap log history
        setCollection(STORAGE_KEY_AUDIT, audit);
      } catch (e) {
        console.warn('Audit record failed:', e);
      }
    },

    getAuditLogs: async function () {
      const user = this.getCurrentUser();
      if (!user || user.role !== 'admin') {
        return { error: { message: 'Access Denied: Admin role required to view Audit Logs' } };
      }
      return { data: getCollection(STORAGE_KEY_AUDIT), error: null };
    },

    // --- ROUTE GUARD & RBAC ---
    requireAuth: function (requiredRole) {
      const user = this.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
      }
      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        alert('Access Denied: You do not have the required permissions (' + requiredRole + ') to view this page.');
        window.location.href = 'dashboard.html';
        return false;
      }
      return true;
    },

    // --- GLOBAL NAVBAR AUTH INJECTOR ---
    initNavbarAuth: function () {
      document.addEventListener('DOMContentLoaded', () => {
        const navLinks = document.getElementById('navLinks');
        if (!navLinks) return;

        const user = RSApp.getCurrentUser();
        // Remove existing dynamic auth buttons if any
        const existingAuth = navLinks.querySelectorAll('.nav-auth-item');
        existingAuth.forEach(el => el.remove());

        if (user) {
          // User is signed in
          if (user.role === 'admin') {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'nav-auth-item' + (window.location.pathname.includes('admin.html') ? ' active-page' : '');
            adminLink.innerHTML = '🛡️ Admin Panel';
            adminLink.style.color = 'var(--primary-dark)';
            adminLink.style.fontWeight = '700';
            navLinks.appendChild(adminLink);
          }

          const dashLink = document.createElement('a');
          dashLink.href = 'dashboard.html';
          dashLink.className = 'nav-auth-item' + (window.location.pathname.includes('dashboard.html') ? ' active-page' : '');
          dashLink.innerHTML = '📊 Dashboard';
          navLinks.appendChild(dashLink);

          const logoutBtn = document.createElement('button');
          logoutBtn.className = 'nav-auth-item btn btn-outline';
          logoutBtn.style.padding = '6px 14px';
          logoutBtn.style.fontSize = '0.85rem';
          logoutBtn.style.cursor = 'pointer';
          logoutBtn.innerHTML = '🚪 Logout';
          logoutBtn.onclick = async () => {
            await RSApp.signOut();
            window.location.href = 'index.html';
          };
          navLinks.appendChild(logoutBtn);
        } else {
          // User is guest
          const loginLink = document.createElement('a');
          loginLink.href = 'login.html';
          loginLink.className = 'nav-auth-item' + (window.location.pathname.includes('login.html') ? ' active-page' : '');
          loginLink.innerHTML = '🔐 Login / Register';
          navLinks.appendChild(loginLink);
        }
      });
    }
  };

  window.RSApp = RSApp;
  RSApp.initNavbarAuth();

})(window);
