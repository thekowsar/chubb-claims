package com.chubb.claims.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    /** Enabled menu items for a role, as DTOs, in sort order (03 §4.4 "Menu for a role"). */
    @Query("""
            select new com.chubb.claims.menu.MenuItemDto(m.code, m.label, m.route, m.icon, m.sortOrder)
            from Role r join r.menus m
            where r.code = :roleCode and m.enabled = true
            order by m.sortOrder asc, m.code asc
            """)
    List<MenuItemDto> findMenuItemsByRoleCode(@Param("roleCode") String roleCode);
}
