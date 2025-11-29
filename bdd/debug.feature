Feature: Debug Page
  As a developer or advanced user
  I want to view system information and debug data
  So that I can diagnose issues and update firmware

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected
    And I am on the Debug view

  @debug @system-info
  Scenario: View system information
    Then I should see system information including:
      | field          | description                    |
      | CHIP_ID        | ESP32 chip identifier          |
      | CHIP_MODEL     | ESP32 model name               |
      | CPU_FREQ       | CPU frequency in MHz           |
      | SDK_VERSION    | ESP-IDF SDK version            |
      | MAC_ADDRESS    | Device MAC address             |
      | FREE_HEAP      | Available heap memory          |
      | VERSION        | PIDKiln firmware version       |

  @debug @websocket-log
  Scenario: WebSocket message log is hidden by default
    Then the WebSocket message log should not be visible
    And the "Show WebSocket messages" checkbox should be unchecked

  @debug @websocket-log @toggle
  Scenario: Toggle WebSocket message log
    When I check the "Show WebSocket messages" checkbox
    Then the WebSocket message log should be visible
    And incoming messages should be displayed in the log
    When I uncheck the checkbox
    Then the log should be hidden

  @debug @websocket-log @persistence
  Scenario: WebSocket log toggle state persists
    When I check the "Show WebSocket messages" checkbox
    And I reload the page
    Then the checkbox should still be checked
    And the WebSocket log should be visible

  @debug @firmware-update
  Scenario: Firmware update widget
    Then I should see a "Firmware Update" section
    And there should be a file input accepting .bin files
    And there should be an "Upload" button
    And there should be a warning about device restart

  @debug @firmware-update @upload
  Scenario: Upload firmware
    When I select a .bin firmware file
    And I click the "Upload" button
    Then a confirmation dialog should appear
    When I confirm the upload
    Then the firmware should be uploaded to the device
    And a progress indicator should be shown
    And the device should restart after successful upload

  @debug @firmware-update @cancel
  Scenario: Cancel firmware upload
    When I select a .bin firmware file
    And I click the "Upload" button
    And I cancel the confirmation dialog
    Then the upload should not proceed

