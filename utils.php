<?php
/**
 * Common utility functions for the project.
 */

if (!function_exists('e')) {
    /**
     * Escape a value for safe HTML output.
     * - Converts special characters to HTML entities using UTF-8.
     * - Handles arrays and objects by converting to string via json_encode.
     *
     * @param mixed $value
     * @return string
     */
    function e($value): string
    {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
