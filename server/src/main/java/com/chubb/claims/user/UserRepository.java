package com.chubb.claims.user;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /** Login: user and role in one query (03 §6). */
    @EntityGraph(attributePaths = "role")
    Optional<User> findWithRoleByUsername(String username);

    @EntityGraph(attributePaths = "role")
    Optional<User> findWithRoleById(Long id);

    boolean existsByUsername(String username);

    /** Staff list (03 §4.4): enabled users of one role, by display name. */
    @Query("select u from User u join fetch u.role r where r.code = :code and u.enabled = true order by u.displayName")
    List<User> findByRoleCodeAndEnabledTrueOrderByDisplayNameAsc(@Param("code") String code);

    @EntityGraph(attributePaths = "role")
    Optional<User> findByUsername(String username);
}
