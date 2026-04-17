<template>
  <router-view />
</template>

<script setup>
</script>

<style>
:root {
  --sidebar-width: 240px;
}

body {
  font-family: 'Segoe UI', 'Noto Sans TC', sans-serif;
  background-color: #f8f9fa;
}

.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: #1e293b;
  color: #cbd5e1;
  flex-shrink: 0;
}

.sidebar .nav-link {
  color: #94a3b8;
  border-radius: 6px;
  margin: 2px 8px;
  transition: all 0.2s;
}

.sidebar .nav-link:hover,
.sidebar .nav-link.active {
  color: #f1f5f9;
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar .nav-link i {
  width: 20px;
  text-align: center;
}

.topbar {
  height: 60px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.main-content {
  min-height: calc(100vh - 60px);
  overflow-x: hidden;
}

.kpi-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
}

.table thead th {
  background-color: #f8fafc;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  border-bottom: 2px solid #e2e8f0;
}

.badge {
  font-size: 0.78rem;
  padding: 0.35em 0.65em;
}

.modal-header {
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.btn-primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.btn-primary:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.offcanvas-sidebar {
  width: var(--sidebar-width) !important;
  background: #1e293b !important;
}

.task-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
</style>
