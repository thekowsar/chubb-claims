-- V2: reference data from planning/03-db-design.md sections 3.0 and 3.5.
-- Roles, menus and role_menu are fixed data with no secrets. Users are created by the Java DataSeeder (BCrypt).

INSERT INTO roles (code, name, description) VALUES
    ('CLAIMANT',     'Claimant',     'Reports incidents and tracks own claims'),
    ('CLAIMS_STAFF', 'Claims staff', 'Works assigned claims through to a decision'),
    ('MANAGER',      'Manager',      'Assigns claims and sees team workload and liability');

INSERT INTO menus (code, label, route, icon, sort_order, enabled) VALUES
    ('MY_CLAIMS',  'My claims',     '/claimant/claims',     'list',      10, TRUE),
    ('NEW_CLAIM',  'New claim',     '/claimant/claims/new', 'add',       20, TRUE),
    ('MY_QUEUE',   'My work queue', '/staff/queue',         'inbox',     10, TRUE),
    ('DASHBOARD',  'Dashboard',     '/manager/dashboard',   'dashboard', 10, TRUE),
    ('ALL_CLAIMS', 'All claims',    '/manager/claims',      'list',      20, TRUE);

INSERT INTO role_menu (role_id, menu_id)
SELECT r.id, m.id FROM roles r, menus m
WHERE (r.code = 'CLAIMANT'     AND m.code IN ('MY_CLAIMS', 'NEW_CLAIM'))
   OR (r.code = 'CLAIMS_STAFF' AND m.code IN ('MY_QUEUE'))
   OR (r.code = 'MANAGER'      AND m.code IN ('DASHBOARD', 'ALL_CLAIMS'));
