#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动解决合并冲突，选择HEAD版本
"""
import re
import sys

def resolve_conflicts(content):
    """解决合并冲突，选择HEAD版本"""
    # 匹配冲突块：<<<<<<< HEAD ... ======= ... >>>>>>>
    pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+\n'
    
    def replace_conflict(match):
        head_content = match.group(1)
        return head_content + '\n'
    
    # 替换所有冲突
    resolved = re.sub(pattern, replace_conflict, content, flags=re.DOTALL)
    return resolved

def main():
    files = [
        'src/components/AIChatPanel.vue',
        'src/views/Report.vue'
    ]
    
    for filepath in files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 检查是否有冲突
            if '<<<<<<< HEAD' in content:
                print(f'解决 {filepath} 中的冲突...')
                resolved = resolve_conflicts(content)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(resolved)
                print(f'✓ {filepath} 冲突已解决')
            else:
                print(f'✓ {filepath} 无冲突')
        except Exception as e:
            print(f'✗ 处理 {filepath} 时出错: {e}')
            sys.exit(1)

if __name__ == '__main__':
    main()

