#!/usr/bin/python

import sys
import hotshot.stats

def main():
    stats = hotshot.stats.load(sys.argv[1])
    #stats.strip_dirs()
    stats.sort_stats('time', 'calls')
    stats.print_stats(20)

if __name__ == '__main__':
    main()
